var chunkSize = 0.5 * 1024 * 1024; // 0.5MB; can be changed
var uploadStartTime; // for testing

TransferQueue = function(isUpload) {
  var self = this, name;
  if (isUpload) {
    name = 'UploadTransferQueue';
    self.isUploadQueue = true;
  } else {
    name = 'DownloadTransferQueue';
    self.isUploadQueue = false;
  }
  self.queue = new PowerQueue({
    name: name,
    autostart: true
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

TransferQueue.prototype.cacheUpload = function(fsFile, start, callback) {
  var self = this;
  if (self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start, type: "upload"})) {
    // If already cached, don't do it again
    callback();
  } else {
    self.collection.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, start: start, type: "upload"}, callback);
  }
};

TransferQueue.prototype.markChunkUploaded = function(fsFile, start, callback) {
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

TransferQueue.prototype.unCacheUpload = function(fsFile, callback) {
  var self = this;
  self.collection.remove({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload"}, callback);
};

TransferQueue.prototype.cacheDownload = function(fsFile, copyName, start, callback) {
  var self = this;
  if (self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start, type: "download"})) {
    // If already cached, don't do it again
    callback();
  } else {
    self.collection.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start, type: "download"}, callback);
  }
};

TransferQueue.prototype.addDownloadedData = function(fsFile, copyName, start, data, callback) {
  var self = this;

  if (typeof copyName !== "string") {
    copyName = "_master";
  }

  function save(data) {
    fsFile.setDataFromBinary(data);
    fsFile.saveLocal(fsFile.copies[copyName].name);
    // Now that we've saved it, clear the cache
    self.unCacheDownload(fsFile, copyName, callback);
  }

  if (typeof start === "number") {
    self.collection.update({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start, type: "download"}, {$set: {data: data}}, function(err) {
      if (err) {
        callback(err);
        return;
      }
      var totalChunks = Math.ceil(fsFile.size / chunkSize);
      var cachedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download", data: {$exists: true}}, {sort: {start: 1}});
      var cnt = cachedChunks.count();
      console.log("Downloaded", cnt, "of", totalChunks);
      if (totalChunks === cnt) {
        // All chunks have been downloaded into the cache
        // Combine chunks
        console.log("Loading chunks into file object");
        var bin = EJSON.newBinary(fsFile.size), r = 0;
        cachedChunks.rewind();
        cachedChunks.forEach(function(chunkCache) {
          var d = chunkCache.data;
          for (var i = 0, ln = d.length; i < ln; i++) {
            bin[r] = d[i];
            r++;
          }
        });
        // Save combined data
        save(bin);
      } else {
        callback();
      }
    });
  } else {
    // There is just one chunk, so save the downloaded file.
    save(data);
  }
};

TransferQueue.prototype.unCacheDownload = function(fsFile, copyName, callback) {
  var self = this;
  self.collection.remove({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download"}, callback);
};

var uploadChunk = function(tQueue, fsFile, start, end, added) {
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
      //added();
    });
  });
};

TransferQueue.prototype.uploadFile = function(fsFile) {
  var self = this, size = fsFile.size;
  if (typeof size !== 'number') {
    throw new Error('TransferQueue upload failed: fsFile size not set');
  }

  uploadStartTime = Date.now();
  var chunks = Math.ceil(size / chunkSize), addedChunks = 0;

  function chunkAdded() {
//    addedChunks++;
//    if (addedChunks === chunks) {
//      self.queue.run();
//    }
  }

  for (var chunk = 0; chunk < chunks; chunk++) {
    var start = chunk * chunkSize;
    var end = start + chunkSize;
    Meteor.setTimeout(function(tQueue, fsFile, start, end, chunkAdded) {
      return function() {
        uploadChunk(tQueue, fsFile, start, end, chunkAdded);
      };
    }(self, fsFile, start, end, chunkAdded), 0);
  }
};

// Downloading is a bit different from uploading. We cache data as it comes back
// rather than before making the method calls.
var downloadChunk = function(tQueue, fsFile, copyName, start, added) {
  fsFile.useCollection('TransferQueue download', function() {
    var collection = this;
    tQueue.cacheDownload(fsFile, copyName, start, function(err) {
      tQueue.queue.add(function(complete) {
        console.log("downloading bytes starting from " + start);
        Meteor.apply(collection.methodName + '/get',
                [fsFile, copyName, start],
                function(err, data) {
                  if (err) {
                    complete();
                    throw err;
                  } else {
                    tQueue.addDownloadedData(fsFile, copyName, start, data, function(err) {
                      complete();
                    });
                  }
                });
      });
      //added();
    });
  });
};

TransferQueue.prototype.downloadFile = function(/* fsFile, copyName */) {
  var self = this;

  var args = parseArguments(arguments,
          ["fsFile", ["copyName"]],
          [FS.File, String]);
  if (args instanceof Error)
    throw args;
  var fsFile = args.fsFile,
          copyName = args.copyName;

  if (typeof copyName !== "string") {
    copyName = "_master";
  }

  var copyInfo = fsFile.copies[copyName];

  if (!copyInfo) {
    throw new Error('TransferQueue download failed: no info for copy ' + copyName);
  }

  var size = copyInfo.size;

  if (typeof size !== 'number') {
    throw new Error('TransferQueue download failed: fsFile size not set for copy ' + copyName);
  }

  // Load via DDP
  var chunks = Math.ceil(size / chunkSize), addedChunks = 0;

  function chunkAdded() {
//    addedChunks++;
//    if (addedChunks === chunks) {
//      self.queue.run();
//    }
  }

  for (var chunk = 0; chunk < chunks; chunk++) {
    var start = chunk * chunkSize;
    Meteor.setTimeout(function(tQueue, fsFile, copyName, start, chunkAdded) {
      return function() {
        downloadChunk(tQueue, fsFile, copyName, start, chunkAdded);
      };
    }(self, fsFile, copyName, start, chunkAdded), 0);
  }
};

TransferQueue.prototype.isUploadingFile = function(fsFile) {
  var self = this;
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload"});
};

TransferQueue.prototype.isDownloadingFile = function(fsFile, copyName) {
  var self = this;
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download"});
};

TransferQueue.prototype.cancel = function() {
  var self = this;
  self.queue.reset();
  if (self.isUploadQueue) {
    self.collection.remove({type: "upload"});
  } else {
    self.collection.remove({type: "download"});
  }
};

// Reactive status percent for the queue in total or a
// specific file
TransferQueue.prototype.progress = function(fsFile, copyName) {
  var self = this;
  if (fsFile) {
    if (self.isUploadQueue) {
      var totalChunks = Math.ceil(fsFile.size / chunkSize);
      var uploadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, type: "upload", done: true}).count();
      return Math.round(uploadedChunks / totalChunks * 100);
    } else {
      if (typeof copyName !== "string") {
        copyName = "_master";
      }
      var totalChunks = Math.ceil(fsFile.size / chunkSize);
      var downloadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download", data: {$exists: true}}).count();
      return Math.round(downloadedChunks / totalChunks * 100);
    }
  } else {
    return self.queue.progress();
  }
};