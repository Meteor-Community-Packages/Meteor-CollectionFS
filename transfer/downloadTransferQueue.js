/* 
 * Download Transfer Queue
 */

var chunkSize = 0.5 * 1024 * 1024; // 0.5MB; can be changed

DownloadTransferQueue = function() {
  var self = this, name = 'DownloadTransferQueue';
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

  // Load via DDP
  var chunks = Math.ceil(size / chunkSize);

  for (var chunk = 0; chunk < chunks; chunk++) {
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
      var downloadedChunks = self.collection.find({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download", data: {$exists: true}}).count();
      return Math.round(downloadedChunks / totalChunks * 100);
  } else {
    return self.queue.progress();
  }
};

DownloadTransferQueue.prototype.cancel = function() {
  var self = this;
  self.queue.reset();
    self.collection.remove({type: "download"});
};

DownloadTransferQueue.prototype.isDownloadingFile = function(fsFile, copyName) {
  var self = this;
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  return !!self.collection.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download"});
};

DownloadTransferQueue.prototype.addDownloadedData = function(fsFile, copyName, start, data, callback) {
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

// Private

var cacheDownload = function(col, fsFile, copyName, start, callback) {
  if (col.findOne({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start, type: "download"})) {
    // If already cached, don't do it again
    callback();
  } else {
    col.insert({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, start: start, type: "download"}, callback);
  }
};

var unCacheDownload = function(col, fsFile, copyName, callback) {
  col.remove({fileId: fsFile._id, collectionName: fsFile.collectionName, copyName: copyName, type: "download"}, callback);
};

// Downloading is a bit different from uploading. We cache data as it comes back
// rather than before making the method calls.
var downloadChunk = function(tQueue, fsFile, copyName, start) {
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
    });
  });
};