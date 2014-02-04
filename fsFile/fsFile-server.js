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
 * @param {string} copyName
 * @param {number} maxTries
 * @return {undefined}
 */
FS.File.prototype.logCopyFailure = function(copyName, maxTries) {
  var self = this;

  // hasCopy will update from the fileRecord
  if (self.hasCopy(copyName)) {
    throw new Error("logCopyFailure: invalid copyName");
  }

  // Make sure we have a temporary file saved since we will be
  // trying the save again.
  TempStore.ensureForFile(self);

  var now = new Date;
  var currentCount = (self.failures && self.failures.copies && self.failures.copies[copyName] && typeof self.failures.copies[copyName].count === "number") ? self.failures.copies[copyName].count : 0;
  maxTries = maxTries || 5;

  var modifier = {};
  modifier.$set = {};
  modifier.$set['failures.copies.' + copyName + '.lastAttempt'] = now;
  if (currentCount === 0) {
    modifier.$set['failures.copies.' + copyName + '.firstAttempt'] = now;
  }
  modifier.$set['failures.copies.' + copyName + '.count'] = currentCount + 1;
  modifier.$set['failures.copies.' + copyName + '.doneTrying'] = (currentCount + 1 >= maxTries);
  self.update(modifier);
};

/**
 * Has this store permanently failed?
 * @param {type} [copyName=_master]
 * @return {boolean} Has this store failed permanently?
 */
FS.File.prototype.failedPermanently = function(copyName) {
  var self = this;
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  return !!(self.failures
          && self.failures.copies
          && self.failures.copies[copyName]
          && self.failures.copies[copyName].doneTrying);
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
  callback = callback || defaultCallback;
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
  callback = callback || defaultCallback;
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

    var store = self.collection.getStoreForCopy(options.copyName);

    if (typeof store === 'undefined' || store === null) {
      throw new Error('FS.File.get could not find "' + options.copyName + '" Storage Adapter on FS.Collection "' + this.name + '"');
    }

    if (partial) {
      if (!(typeof store.getBytes === "function")) {
        throw new Error('FS.File.get: storage adapter for "' + options.copyName + '" does not support partial retrieval');
      }
      var buffer = store.getBytes(self, options.start, options.end, {copyName: options.copyName});
      return bufferToBinary(buffer);
    } else {
      var buffer = store.getBuffer(self, {copyName: options.copyName});
      return bufferToBinary(buffer);
    }
    
  }
};