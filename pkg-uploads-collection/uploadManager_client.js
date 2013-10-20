//not exported
_uploadManager = function(uploadsCollection) {
  var self = this;
  self._name = uploadsCollection._name;
  self.spawns = 1;  //0 = we dont spawn into "threads", 1..n = we spawn multiple "threads"
  self._deps = {
    currentSpeed: new Deps.Dependency,
    currentFileId: new Deps.Dependency,
    paused: new Deps.Dependency
  };
  self._queue = [];
  self._paused = false;
  self._processing = false;
  self._uploadsCollection = uploadsCollection;
  self._reset();
};

/*
 * Public API
 */

//TODO
_uploadManager.prototype.pause = function() {
  var self = this;
  self._paused = true;
  self._deps.paused.changed();

  if (self._currentFileId)
    self._uploadsCollection.update({_id: self._currentFileId}, {$set: {paused: true}});

  //speed reset
  self.lastTimeSpeedCalculated = null;
  self.speedCalcIndex = 0;
  self._currentSpeed = 0;
  self._deps.currentSpeed.changed();
};

//TODO
_uploadManager.prototype.resume = function() {
  var self = this;
  self._paused = false;
  self._deps.paused.changed();

  if (self._currentFileId) {
    self._uploadsCollection.update({_id: self._currentFileId}, {$unset: {paused: 1}});
    self._spawnUploaders(self._currentFileId);
  } else {
    self._uploadNextFile();
  }
};

/*
 * Public Reactive API
 */

_uploadManager.prototype.currentSpeed = function() {
  var self = this;
  self._deps.currentSpeed.depend();
  return self._currentSpeed || 0;
};

_uploadManager.prototype.currentFileId = function() {
  var self = this;
  self._deps.currentFileId.depend();
  return self._currentFileId || false;
};

//TODO test
_uploadManager.prototype.isPaused = function() {
  var self = this;
  self._deps.paused.depend();
  return self._paused;
};

/*
 * Private API
 */

_uploadManager.prototype._updateCurrentSpeed = function() {
  var self = this;
  if (self.speedCalcIndex) {
    self.speedCalcIndex++;
  } else {
    self.speedCalcIndex = 0;
  }

  if (!self.lastTimeSpeedCalculated) {
    self.lastTimeSpeedCalculated = Date.now();
    return;
  }

  if (self.speedCalcIndex === 10) {
    //update speed
    var bitPrSec = (8 * self.currentFileObject.chunkSize * 10) / ((Date.now() - self.lastTimeSpeedCalculated) / 100);
    var oldBitPrSec = self._currentSpeed || bitPrSec;
    self._currentSpeed = Math.round((oldBitPrSec * 9 + bitPrSec) / 10);
    self._deps.currentSpeed.changed();

    //reset
    self.speedCalcIndex = 0;
    self.lastTimeSpeedCalculated = Date.now();
  }
};

_uploadManager.prototype._uploadBlob = function(fileObject) {
  check(fileObject, FileObject);
  var self = this;
  self._queue.push(fileObject);
  self._uploadNextFile();
};

_uploadManager.prototype._uploadChunk = function(chunkNum, data) {
  var self = this;
  
  Meteor.apply(
          "uploadChunk_" + self._name,
          [self._currentFileId, chunkNum, data],
          {
            wait: true
          },
  function(err, result) {
    if (err) {
      self._processing = false;
      throw err;
    }

    self._uploadNextChunk();
  }
  );
};

_uploadManager.prototype._spawnUploaders = function() {
  var self = this;
  if (!self.spawns) {
    self._uploadNextChunk();
  } else {
    for (var i = 0; i < self.spawns; i++) {
      setTimeout(function() {
        self._uploadNextChunk();
      });
    }
  }
};

_uploadManager.prototype._uploadNextChunk = function() {
  var self = this;
  
  self._updateCurrentSpeed();
  
  var chunkNum = self._nextChunk;
  if (chunkNum === false) {
    //we've uploaded all chunks; begin the next file in the queue
    self._uploadsCollection.update({_id: self._currentFileId}, {$unset: {uploading: 1}});
    self._processing = false;
    self._uploadNextFile();
    return;
  }

  self.currentFileObject.getChunk(chunkNum, function (chunkNum, data) {
    self._uploadChunk(chunkNum, data);
  });
  self._nextChunk++;
  if (self._nextChunk > self.currentFileObject.expectedChunks() - 1) {
    self._nextChunk = false;
  }
};

_uploadManager.prototype._uploadNextFile = function() {
  var self = this;

  if (self._processing)
    return;

  self._reset();

  //next
  var next = self._queue.shift();
  if (!next)
    return; //done processing all files

  self._processing = true;

  //begin next
  self.currentFileObject = next;
  self._currentFileId = self.currentFileObject._id;
  self._deps.currentFileId.changed();
  self._uploadsCollection.update({_id: self._currentFileId}, {$set: {uploading: true}});
  self._spawnUploaders();
};

_uploadManager.prototype._reset = function() {
  var self = this;
  self._currentFileId = null;
  self._deps.currentFileId.changed();
  self.currentFileObject = null;
  self._nextChunk = 0;
};