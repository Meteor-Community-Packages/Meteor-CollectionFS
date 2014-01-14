/* 
 * Download Transfer Queue
 */

var chunkSize = 0.5 * 1024 * 1024; // 0.5MB; can be changed
var cachedChunks = {};

DownloadTransferQueue = function(opts) {
  var self = this, name = 'DownloadTransferQueue';
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

  // Currently this won't work because we're not caching to a persistent client
  // store.
  // 
//  Meteor.startup(function() {
//    // Resume unfinished downloads when clients restart
//    self.collection.find({data: null}).forEach(function(doc) {
//      downloadChunk(self, doc.fo, doc.copyName, doc.start);
//    });
//  });
};

DownloadTransferQueue.prototype.downloadFile = function(/* fsFile, copyName */) {
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

  // Prep the chunk cache
  cachedChunks[fsFile.collectionName] = cachedChunks[fsFile.collectionName] || {};
  cachedChunks[fsFile.collectionName][fsFile._id] = cachedChunks[fsFile.collectionName][fsFile._id] || {};
  cachedChunks[fsFile.collectionName][fsFile._id][copyName] = cachedChunks[fsFile.collectionName][fsFile._id][copyName] || {count: 0, data: null};

  // Download via DDP
  for (var chunk = 0, chunks = Math.ceil(size / chunkSize); chunk < chunks; chunk++) {
    var start = chunk * chunkSize;
    Meteor.setTimeout(function(tQueue, fsFile, copyName, start) {
      return function() {
        downloadChunk(tQueue, fsFile, copyName, start);
      };
    }(self, fsFile, copyName, start), 0);
  }
};

// Reactive status percent for the queue in total or a
// specific file
DownloadTransferQueue.prototype.progress = function(fsFile, copyName) {
  var self = this;
  if (fsFile) {
    if (typeof copyName !== "string") {
      copyName = "_master";
    }
    var totalChunks = Math.ceil(fsFile.size / chunkSize);
    var downloadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, data: true}).count();
    return Math.round(downloadedChunks / totalChunks * 100);
  } else {
    return self.queue.progress();
  }
};

DownloadTransferQueue.prototype.cancel = function() {
  var self = this;
  self.queue.reset();
  self.collection.remove({});
};

DownloadTransferQueue.prototype.isDownloadingFile = function(fsFile, copyName) {
  var self = this;
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName});
};

// Private

var cacheDownload = function(col, fsFile, copyName, start, callback) {
  if (col.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start})) {
    // If already cached, don't do it again
    callback();
  } else {
    col.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start}, callback);
  }
};

var unCacheDownload = function(col, fsFile, copyName, callback) {
  delete cachedChunks[fsFile.collectionName][fsFile._id][copyName];
  col.remove({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName}, callback);
};

// Downloading is a bit different from uploading. We cache data as it comes back
// rather than before making the method calls.
var downloadChunk = function(tQueue, fsFile, copyName, start) {
  if (fsFile.isMounted()) {

    cacheDownload(tQueue.collection, fsFile, copyName, start, function(err) {
      tQueue.queue.add(function(complete) {
        console.log("downloading bytes starting from " + start);
        tQueue.connection.apply(fsFile.collection.methodName + '/get',
                [fsFile, copyName, start, start + chunkSize],
                function(err, data) {
                  if (err) {
                    complete();
                    throw err;
                  } else {
                    addDownloadedData(tQueue.collection, fsFile, copyName, start, data, function(err) {
                      complete();
                    });
                  }
                });
      });
    });

  }

};

var addDownloadedData = function(col, fsFile, copyName, start, data, callback) {
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  
  col.update({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start}, {$set: {data: true}}, function(err) {
    if (err) {
      callback(err);
      return;
    }

    // Save chunk into temp binary object.
    // We could cache data in the tracking collection, but currently
    // minimongo clones everything, which results in double memory consumption
    // and much slower downloads.
    var totalChunks = Math.ceil(fsFile.size / chunkSize);
    var cnt = cachedChunks[fsFile.collectionName][fsFile._id][copyName]["count"] += 1;
    var bin = cachedChunks[fsFile.collectionName][fsFile._id][copyName]["data"] = cachedChunks[fsFile.collectionName][fsFile._id][copyName]["data"] || EJSON.newBinary(fsFile.size);
    for (var i = 0, ln = data.length, r = start; i < ln; i++) {
      bin[r] = data[i];
      r++;
    }
    if (totalChunks === cnt) {
      // All chunks have been downloaded into the cache
      // Save combined data
      fsFile.setDataFromBinary(bin);
      fsFile.saveLocal(fsFile.copies[copyName].name);
      // Now that we've saved it, clear the cache
      unCacheDownload(col, fsFile, copyName, callback);
    } else {
      callback();
    }
  });
};