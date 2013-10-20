//not exported
_downloadManager = function(name) {
  var self = this;
  self._name = name;
  self.spawns = 1;  //0 = we dont spawn into "threads", 1..n = we spawn multiple "threads"
  self._deps = {
    currentSpeed: new Deps.Dependency,
    currentFileId: new Deps.Dependency,
    paused: new Deps.Dependency,
    progress: new Deps.Dependency
  };
  self._queue = [];
  self._paused = false;
  self._processing = false;
  self._reset();
};

/*
 * Public API
 */

//TODO test
_downloadManager.prototype.pause = function() {
  var self = this;
  self._paused = true;
  self._deps.paused.changed();

  //speed reset
  self.lastTimeSpeedCalculated = null;
  self.speedCalcIndex = 0;
  self._currentSpeed = 0;
  self._deps.currentSpeed.changed();
};

//TODO test
_downloadManager.prototype.resume = function() {
  var self = this;
  self._paused = false;
  self._deps.paused.changed();

  if (self._currentFileID) {
    self._spawnDownloaders(self._currentFileId);
  } else {
    self._downloadNextFile();
  }
};

/*
 * Public Reactive API
 */

_downloadManager.prototype.currentSpeed = function() {
  var self = this;
  self._deps.currentSpeed.depend();
  return self._currentSpeed || 0;
};

_downloadManager.prototype.currentFileId = function() {
  var self = this;
  self._deps.currentFileId.depend();
  return self._currentFileId || false;
};

_downloadManager.prototype.getProgressForFileId = function (fileId) {
  var self = this;
  self._deps.progress.depend();
  self._deps.currentFileId.depend();
  
  if (self._currentFileId !== fileId)
    return 0;
  
  return self._progress;
};

//TODO test
_downloadManager.prototype.isPaused = function() {
  var self = this;
  self._deps.paused.depend();
  return self._paused;
};

/*
 * Private API
 */

_downloadManager.prototype._updateProgress = function() {
  var self = this;
  if (!self.currentFileObject || !self.currentFileObject._addedChunks) {
    self._progress = 0;
  } else {
    self._progress = (self.currentFileObject._addedChunks.length / self.currentFileObject.expectedChunks()) * 100;
  }
  self._deps.progress.changed();
};

_downloadManager.prototype._updateCurrentSpeed = function() {
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

_downloadManager.prototype._downloadBlob = function(fileObject, callback) {
  check(fileObject, FileObject);
  var self = this;

  self._queue.push({fo: fileObject, callback: callback});
  self._downloadNextFile();
};

_downloadManager.prototype._downloadChunk = function(chunkNum) {
  var self = this;

  Meteor.apply(
          "downloadChunk_" + self._name,
          [{files_id: self._currentFileId, n: chunkNum}],
  {
    wait: true
  },
  function(err, chunk) {
    if (err) {
      self._processing = false;
      throw err;
    }
    self.currentFileObject.addDataChunk(chunkNum, chunk);
    self._downloadNextChunk();
  }
  );
};

_downloadManager.prototype._spawnDownloaders = function() {
  var self = this;
  if (!self.spawns) {
    self._downloadNextChunk();
  } else {
    for (var i = 0; i < self.spawns; i++) {
      setTimeout(function() {
        self._downloadNextChunk();
      });
    }
  }
};

_downloadManager.prototype._downloadNextChunk = function() {
  var self = this;
  
  self._updateProgress();
  self._updateCurrentSpeed();
  
  var chunkNum = self._nextChunk;
  if (chunkNum === false) {
    //we've downloaded all chunks
    if (!self.currentFileObject.blob)
      throw new Error("unable to download Blob for FileObject with ID " + self._currentFileId);

    self._callback && self._callback(self.currentFileObject.blob);
    self._callback = null;

    //do next file
    self._processing = false;
    self._downloadNextFile();
    return;
  }

  self._downloadChunk(chunkNum);

  self._nextChunk++;
  if (self._nextChunk > self.currentFileObject.expectedChunks() - 1) {
    self._nextChunk = false;
  }
};

_downloadManager.prototype._downloadNextFile = function() {
  var self = this;

  if (self._processing) return;
  
  self._reset();

  //next
  var next = self._queue.shift();
  if (!next) return; //done processing all files
  
  self._processing = true;

  //begin next
  self._callback = next.callback;
  self.currentFileObject = next.fo;
  self._currentFileId = self.currentFileObject._id;
  self._deps.currentFileId.changed();
  self._spawnDownloaders();
};

_downloadManager.prototype._reset = function () {
  var self = this;
  self._currentFileId = null;
  self._deps.currentFileId.changed();
  self.currentFileObject = null;
  self._nextChunk = 0;
  self._callback = null;
  self._progress = 0;
  self._deps.progress.changed();
};