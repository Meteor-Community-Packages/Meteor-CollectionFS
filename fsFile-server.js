// callback(err)
FS.File.prototype.saveDataToFile = function(filePath, callback) {
  var self = this, buffer = self.getBuffer();

  if (!(buffer instanceof Buffer)) {
    callback(new Error("saveBufferToFile: No buffer"));
    return;
  }

  // Call node writeFile
  fs.writeFile(filePath, buffer, Meteor.bindEnvironment(function(err) {
    callback(err);
  }, function(err) {
    callback(err);
  }));
};

/**
 * Notes a details about a storage adapter failure within the file record
 * @param {string} storeName
 * @param {number} maxTries
 * @return {undefined}
 */
FS.File.prototype.logCopyFailure = function(storeName, maxTries) {
  var self = this;

  // hasCopy will update from the fileRecord
  if (self.hasCopy(storeName)) {
    throw new Error("logCopyFailure: invalid storeName");
  }

  // Make sure we have a temporary file saved since we will be
  // trying the save again.
  FS.TempStore.ensureForFile(self);

  var now = new Date;
  var currentCount = (self.failures && self.failures.copies && self.failures.copies[storeName] && typeof self.failures.copies[storeName].count === "number") ? self.failures.copies[storeName].count : 0;
  maxTries = maxTries || 5;

  var modifier = {};
  modifier.$set = {};
  modifier.$set['failures.copies.' + storeName + '.lastAttempt'] = now;
  if (currentCount === 0) {
    modifier.$set['failures.copies.' + storeName + '.firstAttempt'] = now;
  }
  modifier.$set['failures.copies.' + storeName + '.count'] = currentCount + 1;
  modifier.$set['failures.copies.' + storeName + '.doneTrying'] = (currentCount + 1 >= maxTries);
  self.update(modifier);
};

/**
 * Has this store permanently failed?
 * @param {String} storeName The name of the store
 * @return {boolean} Has this store failed permanently?
 */
FS.File.prototype.failedPermanently = function(storeName) {
  var self = this;
  return !!(self.failures
          && self.failures.copies
          && self.failures.copies[storeName]
          && self.failures.copies[storeName].doneTrying);
};

/**
 * @callback FS.File~newFsFileCallback
 * @param {Error} error - An error, or null if successful
 * @param {FS.File} fsFile - A new FS.File instance, or `undefined` if there was an error
 */

/**
 * Loads data from a local path into a new FS.File and passes it to callback.
 * You must specify every argument, but the filename argument may be `null` to
 * extract it from the filePath.
 *
 * @param {string} filePath - The full path to the file on the local filesystem
 * @param {string} [filename="extracted from filePath"] - The name to use for the new FS.File instance
 * @param {string} [type="guessed from extension"] - The content type of the file
 * @param {FS.File~newFsFileCallback} callback
 * @return {undefined}
 */
FS.File.fromFile = function(filePath, filename, type, callback) {
  callback = callback || FS.Utility.defaultCallback;
  filename = filename || path.basename(filePath);
  var fsFile = new FS.File({name: filename});
  fsFile.setDataFromFile(filePath, type, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, fsFile);
    }
  });
};

/**
 * Loads data from a remote URL into a new FS.File and passes it to callback
 * @param {string} url - A full url that points to a remote file
 * @param {string} filename - The name to use for the new FS.File instance
 * @param {FS.File~newFsFileCallback} callback
 * @return {undefined}
 */
FS.File.fromUrl = function(url, filename, callback) {
  callback = callback || FS.Utility.defaultCallback;
  check(url, String);
  check(filename, String);
  var fsFile = new FS.File({name: filename});
  fsFile.setDataFromUrl(url, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, fsFile);
    }
  });
};

/** @method FS.File.prototype._get
  * @private
  */
FS.File.prototype._get = function(options) {
  var self = this;
  // If we have defined a part of the file
  var partial = (typeof options.start === "number" && typeof options.end === "number");
  // On server we contact the storage adapter
  if (self.isMounted()) {

    var store = FS.StorageAdapter(options.storeName || '');
    if (!store) {
      // first store is considered the master store by default
      store = self.collection.options.stores[0];
    }

    if (partial) {
      if (!(typeof store.getBytes === "function")) {
        throw new Error('FS.File.get: storage adapter for "' + options.storeName + '" does not support partial retrieval');
      }
      var buffer = store.getBytes(self, options.start, options.end);
      return FS.Utility.bufferToBinary(buffer);
    } else {
      var buffer = store.getBuffer(self);
      return FS.Utility.bufferToBinary(buffer);
    }

  }
};
