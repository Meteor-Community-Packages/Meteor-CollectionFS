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

// Notes a details about a storage adapter failure within the file record
FS.File.prototype.logCopyFailure = function(copyName, maxTries) {
  var self = this;

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

FS.File.prototype.failedPermanently = function(copyName) {
  var self = this;
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  return (self.failures
          && self.failures.copies
          && self.failures.copies[copyName]
          && self.failures.copies[copyName].doneTrying);
};

// Load data from a local path into a new FS.File and pass it to callback
// callback(err, fsFile)
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

// Load data from a URL into a new FS.File and pass it to callback
// callback(err, fsFile)
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