/* 
 * Download Transfer Queue
 */

var chunkSize = 0.5 * 1024 * 1024; // 0.5MB; can be changed
var cachedChunks = {};

DownloadTransferQueue = function(opts) {
  var self = this, name = 'DownloadTransferQueue';
  opts = opts || {};
  self.connection = opts.connection || DDP.connect(Meteor.connection._stream.rawUrl);

  // Tie login for this connection to login for the main connection
  connectionLogin(self.connection);

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
//      downloadChunk(self, doc.fo, doc.storeName, doc.start);
//    });
//  });
};

/**
 * Adds a chunked download request to the transfer queue. After being downloaded,
 * the browser will save the file like a normal download.
 * 
 * @param {FS.File} fsFile The file to download.
 * @param {String} storeName The store from which to download it.
 * @returns {undefined}
 */
DownloadTransferQueue.prototype.downloadFile = function(/* fsFile, storeName */) {
  var self = this;

  var args = parseArguments(arguments,
          ["fsFile", ["storeName"]],
          [FS.File, String]);
  if (args instanceof Error)
    throw args;
  var fsFile = args.fsFile,
          storeName = args.storeName;

  if (!fsFile.copies || _.isEmpty(fsFile.copies)) {
    throw new Error("downloadFile: No saved copies");
  }

  if (typeof storeName !== "string") {
    // do the best we can
    storeName = _.keys(fsFile.copies)[0];
  }

  var copyInfo = fsFile.copies[storeName];
  if (!copyInfo) {
    throw new Error('TransferQueue download failed: no info for store ' + storeName);
  }

  var size = copyInfo.size;

  if (typeof size !== 'number') {
    throw new Error('TransferQueue download failed: fsFile size not set for store ' + storeName);
  }

  // Prep the chunk cache
  cachedChunks[fsFile.collectionName] = cachedChunks[fsFile.collectionName] || {};
  cachedChunks[fsFile.collectionName][fsFile._id] = cachedChunks[fsFile.collectionName][fsFile._id] || {};
  cachedChunks[fsFile.collectionName][fsFile._id][storeName] = cachedChunks[fsFile.collectionName][fsFile._id][storeName] || {count: 0, data: null};

  // Download via DDP
  for (var chunk = 0, chunks = Math.ceil(size / chunkSize); chunk < chunks; chunk++) {
    var start = chunk * chunkSize;
    Meteor.setTimeout(function(tQueue, fsFile, storeName, start) {
      return function() {
        downloadChunk(tQueue, fsFile, storeName, start);
      };
    }(self, fsFile, storeName, start), 0);
  }
};

/**
 * Reactive status percent for the queue in total or a specific file
 * 
 * @param {FS.File} fsFile The file
 * @param {String} storeName The name of the store to retrieve from
 * @returns {Number} Progress percentage
 */
DownloadTransferQueue.prototype.progress = function(fsFile, storeName) {
  var self = this;
  if (fsFile) {
    if (typeof storeName !== "string") {
      throw new Error("DownloadTransferQueue progress requires storeName");
    }
    var totalChunks = Math.ceil(fsFile.size / chunkSize);
    var downloadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, storeName: storeName, data: true}).count();
    return Math.round(downloadedChunks / totalChunks * 100);
  } else {
    return self.queue.progress();
  }
};

/**
 * Cancel all downloads.
 * @returns {undefined}
 */
DownloadTransferQueue.prototype.cancel = function() {
  var self = this;
  self.queue.reset();
  self.collection.remove({});
};

/**
 * Determines whether we are currently downloading this file from this store.
 * 
 * @param {FS.File} fsFile
 * @param {String} storeName
 * @returns {Boolean} Are we currently downloading this file from this store?
 */
DownloadTransferQueue.prototype.isDownloadingFile = function(fsFile, storeName) {
  var self = this;
  if (typeof storeName !== "string" && fsFile.isMounted()) {
    storeName = fsFile.collection.options.defaultStoreName || null;
  }
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, storeName: storeName});
};

// Private

var cacheDownload = function(col, fsFile, storeName, start, callback) {
  if (col.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, storeName: storeName, start: start})) {
    // If already cached, don't do it again
    callback();
  } else {
    col.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, storeName: storeName, start: start}, callback);
  }
};

var unCacheDownload = function(col, fsFile, storeName, callback) {
  delete cachedChunks[fsFile.collectionName][fsFile._id][storeName];
  col.remove({fileId: fsFile._id, collectionName: fsFile.collectionName, storeName: storeName}, callback);
};

// Downloading is a bit different from uploading. We cache data as it comes back
// rather than before making the method calls.
var downloadChunk = function(tQueue, fsFile, storeName, start) {
  if (fsFile.isMounted()) {

    cacheDownload(tQueue.collection, fsFile, storeName, start, function(err) {
      tQueue.queue.add(function(complete) {
        FS.debug && console.log("downloading bytes starting from " + start);
        tQueue.connection.apply(fsFile.collection.methodName + '/get',
                [fsFile, storeName, start, start + chunkSize],
                {
                  onResultReceived: function(err, data) {
                    if (err) {
                      complete();
                      throw err;
                    } else {
                      addDownloadedData(tQueue.collection, fsFile, storeName, start, data, function(err) {
                        complete();
                      });
                    }
                  }
                });
      });
    });

  }

};

var addDownloadedData = function(col, fsFile, storeName, start, data, callback) {
  col.update({fileId: fsFile._id, collectionName: fsFile.collectionName, storeName: storeName, start: start}, {$set: {data: true}}, function(err) {
    if (err) {
      callback(err);
      return;
    }

    // Save chunk into temp binary object.
    // We could cache data in the tracking collection, but currently
    // minimongo clones everything, which results in double memory consumption
    // and much slower downloads.
    var totalChunks = Math.ceil(fsFile.size / chunkSize);
    var cnt = cachedChunks[fsFile.collectionName][fsFile._id][storeName]["count"] += 1;
    var bin = cachedChunks[fsFile.collectionName][fsFile._id][storeName]["data"] = cachedChunks[fsFile.collectionName][fsFile._id][storeName]["data"] || EJSON.newBinary(fsFile.size);
    for (var i = 0, ln = data.length, r = start; i < ln; i++) {
      bin[r] = data[i];
      r++;
    }
    if (totalChunks === cnt) {
      // All chunks have been downloaded into the cache
      // Save combined data
      fsFile.setDataFromBinary(bin);
      fsFile.saveLocal(fsFile.copies[storeName].name);
      // Now that we've saved it, clear the cache
      unCacheDownload(col, fsFile, storeName, callback);
    } else {
      callback();
    }
  });
};