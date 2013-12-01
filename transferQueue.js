var chunkSize = 262144; // 256k; can be changed

TransferQueue = function(isUpload) {
  var self = this, name;
  if (isUpload) {
    name = 'UploadTransferQueue';
    self.isUploadQueue = true;
  } else {
    name = 'DownloadTransferQueue';
    self.isUploadQueue = false;
  }
  self.queue = new PowerQueue(name);

  // Persistent but client-only collection
  self.collection = new Meteor.Collection(name, {connection: null});

  // This "paused" is slightly different from that of self.queue because
  // this one indicates whether the user wants the queue to be paused
  // whereas the other indicates whether the queue is actually paused,
  // which could be because of having no tasks to run.
  self._paused = false;
  self._progressPercent = 100;
  self._perFileProgress = {};
  if (Meteor.isClient) {
    self._progressPercentDeps = new Deps.Dependency();
    self._pausedDeps = new Deps.Dependency();
    self._queuePausedDeps = new Deps.Dependency();
  }

  // Make queue update reactive queue progress / status
  self.queue.progress = function(left, total) {
    var c = total - left;
    var p = (total === 0) ? 0 : Math.round(c / total * 100);
    if (p !== self._progressPercent) {
      self._progressPercent = p;
      if (self._progressPercentDeps) {
        self._progressPercentDeps.changed();
      }
      if (self._queuePausedDeps) {
        self._queuePausedDeps.changed();
      }
    }
  };

  // If there are any uploads or downloads in the cache,
  // finish them at client load.
  Meteor.startup(function() {
    if (self._progressPercentDeps) {
      self.collection.find().observeChanges(function() {
        self._progressPercentDeps.changed();
      });
    }

    self.collection.find({type: "upload", done: null}).forEach(function(doc) {
      uploadChunk(self, doc.fo, doc.data, doc.start);
    });

    self.collection.find({type: "download", data: null}).forEach(function(doc) {
      downloadChunk(self, doc.fo, doc.selector, doc.start);
    });
  });
};

TransferQueue.prototype.cacheUpload = function(fileObject, data, start, callback) {
  var self = this;
  if (self.collection.findOne({fo: fileObject, start: start, type: "upload"})) {
    // If already cached, don't do it again
    callback();
  }
  self.collection.insert({fo: fileObject, data: data, start: start, type: "upload"}, callback);
};

TransferQueue.prototype.markChunkUploaded = function(fileObject, start, callback) {
  var self = this;
  if (typeof start === "number") {
    // Mark each chunk done for progress tracking
    self.collection.update({fo: fileObject, start: start, type: "upload"}, {$set: {done: true}}, callback);
    var totalChunks = Math.ceil(fileObject.size / chunkSize);
    var doneChunks = self.collection.find({fo: fileObject, type: "upload", done: true});
    if (totalChunks === doneChunks.count()) {
      self.unCacheUpload(fileObject);
    }
  } else {
    // No need to mark anything done since it was quick
    self.unCacheUpload(fileObject);
  }
};

TransferQueue.prototype.unCacheUpload = function(fileObject, callback) {
  var self = this;
  self.collection.remove({fo: fileObject, type: "upload"}, callback);
};

TransferQueue.prototype.cacheDownload = function(fileObject, selector, start, callback) {
  var self = this;
  if (self.collection.findOne({fo: fileObject, selector: selector, start: start, type: "download"})) {
    // If already cached, don't do it again
    callback();
  }
  self.collection.insert({fo: fileObject, selector: selector, start: start, type: "download"}, callback);
};

TransferQueue.prototype.addDownloadedData = function(fileObject, selector, start, data, callback) {
  var self = this;

  function save(data) {
    fileObject.loadBinary(data);
    var filename = (typeof selector === "string") ? fileObject.copies[selector].name : fileObject.master.name;
    fileObject.saveLocal(filename);
    // Now that we've saved it, clear the cache
    self.unCacheDownload(fileObject, selector, callback);
  }

  if (typeof start === "number") {
    self.collection.update({fo: fileObject, selector: selector, start: start, type: "download"}, {$set: {data: data}}, function(err) {
      if (err) {
        callback(err);
        return;
      }
      var totalChunks = Math.ceil(fileObject.size / chunkSize);
      var cachedChunks = self.collection.find({fo: fileObject, selector: selector, type: "download", data: {$exists: true}}, {sort: {start: 1}});
      var cnt = cachedChunks.count();
      console.log("Downloaded", cnt, "of", totalChunks);
      if (totalChunks === cnt) {
        // All chunks have been downloaded into the cache
        // Combine chunks
        console.log("Loading chunks into file object");
        var bin = EJSON.newBinary(fileObject.size), r = 0;
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
      }
    });
  } else {
    // There is just one chunk, so save the downloaded file.
    save(data);
  }
};

TransferQueue.prototype.unCacheDownload = function(fileObject, selector, callback) {
  var self = this;
  self.collection.remove({fo: fileObject, selector: selector, type: "download"}, callback);
};

var uploadChunk = function(tQueue, fileObject, data, start) {
  var collection = _collectionsFS[fileObject.collectionName];
  if (typeof collection === 'undefined') {
    throw new Error('TransferQueue upload failed collectionFS "' + fileObject.collectionName + '" not found');
  }

  tQueue.queue.add(function(complete) {
    Meteor.apply(collection.methodName + '/put',
            [fileObject, data, start],
            {
              wait: true
            },
    function(err) {
      if (err) {
        console.log(err);
      }
      tQueue.markChunkUploaded(fileObject, start, function() {
        if (err) {
          console.log(err);
        }
        complete();
      });
    });
  });
};

// This is done as a recursive function rather than a loop so that
// the closure variables will be correct when the queue tasks are run.
var uploadChunks = function(tQueue, fileObject, size, chunks, chunk) {
  size = size || fileObject.size;
  if (typeof size !== 'number') {
    throw new Error('TransferQueue upload failed: fileObject size not set');
  }

  chunks = chunks || Math.ceil(size / chunkSize);
  chunk = chunk || 0;

  var start = chunk * chunkSize;
  var end = start + chunkSize;
  console.log("uploadChunks: chunk " + chunk + " of " + chunks + " where start is " + start + " and end is " + end + " and file size is " + fileObject.size);
  fileObject.getBytes(start, end, function(err, data) {
    if (err) {
      throw err;
    }
    if (chunks === 1) {
      start = null; //It's a small file. Upload all data in a single method call
    }
    tQueue.cacheUpload(fileObject, data, start, function(err) {
      if (err) {
        console.log(err);
      }
      uploadChunk(tQueue, fileObject, data, start);
    });
  });
  if (chunk < chunks - 1) {
    uploadChunks(tQueue, fileObject, size, chunks, chunk + 1);
  }
};

TransferQueue.prototype.uploadFile = function(fileObject) {
  var self = this;
  console.log('transferQueue: uploadFile');
  uploadChunks(self, fileObject);
};

// Downloading is a bit different from uploading. We cache data as it comes back
// rather than before making the method calls.
var downloadChunk = function(tQueue, fileObject, selector, start) {
  var collection = _collectionsFS[fileObject.collectionName];
  if (typeof collection === 'undefined') {
    throw new Error('TransferQueue upload failed collectionFS "' + fileObject.collectionName + '" not found');
  }

  tQueue.queue.add(function(complete) {
    Meteor.apply(collection.methodName + '/get',
            [fileObject, selector, start],
            {
              wait: true
            },
    function(err, data) {
      if (err) {
        console.log(err);
      }
      tQueue.addDownloadedData(fileObject, selector, start, data, function(err) {
        if (err) {
          console.log(err);
        }
        complete();
      });
    });
  });
};

// This is done as a recursive function rather than a loop so that
// the closure variables will be correct when the queue tasks are run.
var downloadChunks = function(tQueue, fileObject, selector, size, chunks, chunk) {
  if (typeof size !== 'number') {
    if (selector) {
      size = fileObject.copies[selector].size;
    } else {
      size = fileObject.master.size;
    }
  }

  if (typeof size !== 'number') {
    throw new Error('TransferQueue download failed: fileObject size not set');
  }

  chunks = chunks || Math.ceil(size / chunkSize);
  chunk = chunk || 0;

  var start = chunk * chunkSize;
  var end = start + chunkSize;
  console.log("downloadChunks: chunk " + chunk + " of " + chunks + " where start is " + start + " and end is " + end + " and file size is " + fileObject.size);
  if (chunks === 1) {
    start = null; //It's a small file. Upload all data in a single method call
  }
  tQueue.cacheDownload(fileObject, selector, start, function(err) {
    if (err) {
      console.log(err);
    }
    downloadChunk(tQueue, fileObject, selector, start);
  });
  if (chunk < chunks - 1) {
    downloadChunks(tQueue, fileObject, selector, size, chunks, chunk + 1);
  }
};

TransferQueue.prototype.downloadFile = function(/* fileObject, copyName */) {
  var self = this;

  var args = parseArguments(arguments,
          ["fileObject", ["copyName"]],
          [FileObject, String]);
  if (args instanceof Error)
    throw args;
  var fileObject = args.fileObject,
          copyName = args.copyName;

  // Load via DDP
  console.log('transferQueue: downloadFile');
  downloadChunks(self, fileObject, copyName);
};

TransferQueue.prototype.isUploadingFile = function(fileObject) {
  var self = this;
  return !!self.collection.findOne({fo: fileObject, type: "upload"});
};

TransferQueue.prototype.isDownloadingFile = function(fileObject, selector) {
  var self = this;
  selector = selector || null;
  return !!self.collection.findOne({fo: fileObject, selector: selector, type: "download"});
};

TransferQueue.prototype.isPaused = function() {
  var self = this;
  if (self._pausedDeps) {
    self._pausedDeps.depend();
  }
  return self._paused;
};

TransferQueue.prototype.isRunning = function() {
  var self = this;
  if (self._queuePausedDeps) {
    self._queuePausedDeps.depend();
  }
  return !self.queue.paused;
};

TransferQueue.prototype.pause = function() {
  var self = this;
  self.queue.pause();
  self._paused = true;
  if (self._pausedDeps) {
    self._pausedDeps.changed();
  }
};

TransferQueue.prototype.resume = function() {
  var self = this;
  self.queue.run();
  self._paused = false;
  if (self._pausedDeps) {
    self._pausedDeps.changed();
  }
};

// Reactive status percent for the queue in total
TransferQueue.prototype.progress = function(fileObject, selector) {
  var self = this;
  if (self._progressPercentDeps) {
    self._progressPercentDeps.depend();
  }
  if (fileObject) {
    if (self.isUploadQueue) {
      var totalChunks = Math.ceil(fileObject.size / chunkSize);
      var uploadedChunks = self.collection.find({fo: fileObject, type: "upload", done: true}).count();
      return Math.round(uploadedChunks / totalChunks * 100);
    } else {
      selector = selector || null;
      var totalChunks = Math.ceil(fileObject.size / chunkSize);
      var downloadedChunks = self.collection.find({fo: fileObject, selector: selector, type: "download", data: {$exists: true}}).count();
      return Math.round(downloadedChunks / totalChunks * 100);
    }
  } else {
    return self._progressPercent;
  }
};