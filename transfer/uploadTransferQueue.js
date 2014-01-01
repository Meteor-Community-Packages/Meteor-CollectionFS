/* 
 * Upload Transfer Queue
 */

var chunkSize = 0.5 * 1024 * 1024; // 0.5MB; can be changed

UploadTransferQueue = function(opts) {
  var self = this, name = 'UploadTransferQueue';
  opts = opts || {};
  self.connection = opts.connection || DDP.connect(Meteor.connection._stream.rawUrl);
  
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
};

UploadTransferQueue.prototype.uploadFile = function(fsFile) {
  var self = this, size = fsFile.size;
  if (typeof size !== 'number') {
    throw new Error('TransferQueue upload failed: fsFile size not set');
  }

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
    var uploadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, done: true}).count();
    return Math.round(uploadedChunks / totalChunks * 100);
  } else {
    return self.queue.progress();
  }
};

UploadTransferQueue.prototype.cancel = function() {
  var self = this;
  self.queue.reset();
  
  // TODO: Delete partially-uploaded files
  
  self.collection.remove({});
};

UploadTransferQueue.prototype.isUploadingFile = function(fsFile) {
  var self = this;
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName});
};

// Private

var cacheUpload = function(col, fsFile, start, callback) {
  if (col.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start})) {
    // If already cached, don't do it again
    callback();
  } else {
    col.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start}, callback);
  }
};

var unCacheUpload = function(col, fsFile, callback) {
  col.remove({fileId: fsFile._id, collectionName: fsFile.collectionName}, callback);
};

var uploadChunk = function(tQueue, fsFile, start, end) {
  fsFile.useCollection('TransferQueue upload', function() {
    var collection = this;
    cacheUpload(tQueue.collection, fsFile, start, function() {
      tQueue.queue.add(function(complete) {
        console.log("uploading bytes " + start + " to " + Math.min(end, fsFile.size) + " of " + fsFile.size);
        fsFile.getBinary(start, end, function(err, data) {
          if (err) {
            complete();
            throw err;
          }
          var b = new Date;
          tQueue.connection.apply(collection.methodName + '/put',
                  [fsFile, data, start],
                  function(err) {
                    var e = new Date;
                    console.log("server took " + (e.getTime() - b.getTime()) + "ms");
                    if (!err) {
                      markChunkUploaded(tQueue.collection, fsFile, start, function() {
                        complete();
                      });
                    }
                  });
        });
      });
    });
  });
};

var markChunkUploaded = function(col, fsFile, start, callback) {
  // Mark each chunk done for progress tracking
  col.update({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start}, {$set: {done: true}}, function(e, r) {
    if (e) {
      callback(e);
    } else {
      var totalChunks = Math.ceil(fsFile.size / chunkSize);
      var doneChunks = col.find({fileId: fsFile._id, collectionName: fsFile.collectionName, done: true});
      if (totalChunks === doneChunks.count()) {
        unCacheUpload(col, fsFile, callback);
      } else {
        callback();
      }
    }
  });
};