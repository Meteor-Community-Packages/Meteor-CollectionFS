/* 
 * Upload Transfer Queue
 */

var chunkSize = 0.5 * 1024 * 1024; // 0.5MB; can be changed
var uploadStartTime; // for testing

UploadTransferQueue = function() {
  var self = this, name = 'UploadTransferQueue';
  self.queue = new PowerQueue({
    name: name
  });

  // Persistent but client-only collection
  self.collection = new Meteor.Collection(name, {connection: null});
  
  // Pass through some queue properties
  self.pause = self.queue.pause;
  self.resume = self.queue.resume;
  self.isPaused = self.queue.isPaused;
  self.isRunning = self.queue.isRunning;

  Meteor.startup(function() {
    // Resume unfinished downloads when clients restart
    self.collection.find({type: "download", data: null}).forEach(function(doc) {
      downloadChunk(self, doc.fo, doc.copyName, doc.start);
    });
  });
};

UploadTransferQueue.prototype.uploadFile = function(fsFile) {
  var self = this, size = fsFile.size;
  if (typeof size !== 'number') {
    throw new Error('TransferQueue upload failed: fsFile size not set');
  }

  uploadStartTime = Date.now();
  var chunks = Math.ceil(size / chunkSize);

  for (var chunk = 0; chunk < chunks; chunk++) {
    var start = chunk * chunkSize;
    var end = start + chunkSize;
    Meteor.setTimeout(function(tQueue, fsFile, start, end) {
      return function() {
        uploadChunk(tQueue, fsFile, start, end);
      };
    }(self, fsFile, start, end), 0);
  }
};

// Reactive status percent for the queue in total or a
// specific file
UploadTransferQueue.prototype.progress = function(fsFile, copyName) {
  var self = this;
  if (fsFile) {
      var totalChunks = Math.ceil(fsFile.size / chunkSize);
      var uploadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload", done: true}).count();
      return Math.round(uploadedChunks / totalChunks * 100);
  } else {
    return self.queue.progress();
  }
};

UploadTransferQueue.prototype.cancel = function() {
  var self = this;
  self.queue.reset();
    self.collection.remove({type: "upload"});
};

UploadTransferQueue.prototype.isUploadingFile = function(fsFile) {
  var self = this;
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload"});
};

UploadTransferQueue.prototype.markChunkUploaded = function(fsFile, start, callback) {
  var self = this;
  // Mark each chunk done for progress tracking
  self.collection.update({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start, type: "upload"}, {$set: {done: true}}, function(e, r) {
    if (e) {
      callback(e);
    } else {
      var totalChunks = Math.ceil(fsFile.size / chunkSize);
      var doneChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload", done: true});
      if (totalChunks === doneChunks.count()) {
        console.log("Upload finished after", (((new Date).getTime()) - uploadStartTime), "ms");
        self.unCacheUpload(fsFile, callback);
      } else {
        callback();
      }
    }
  });
};

// Private

var cacheUpload = function(col, fsFile, start, callback) {
  if (col.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start, type: "upload"})) {
    // If already cached, don't do it again
    callback();
  } else {
    col.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start, type: "upload"}, callback);
  }
};

var unCacheUpload = function(col, fsFile, callback) {
  col.remove({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload"}, callback);
};

var uploadChunk = function(tQueue, fsFile, start, end) {
  fsFile.useCollection('TransferQueue upload', function() {
    var collection = this;
    tQueue.cacheUpload(fsFile, start, function() {
      tQueue.queue.add(function(complete) {
        console.log("uploading bytes " + start + " to " + Math.min(end, fsFile.size) + " of " + fsFile.size);
        fsFile.getBinary(start, end, function(err, data) {
          if (err) {
            complete();
            throw err;
          }
          var b = new Date;
          Meteor.apply(collection.methodName + '/put',
                  [fsFile, data, start],
                  function(err) {
                    var e = new Date;
                    console.log("server took " + (e.getTime() - b.getTime()) + "ms");
                    if (!err) {
                      tQueue.markChunkUploaded(fsFile, start, function() {
                        complete();
                      });
                    }
                  });
        });
      });
    });
  });
};