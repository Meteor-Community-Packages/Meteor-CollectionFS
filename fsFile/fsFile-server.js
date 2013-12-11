// Save a chunk of the total binary data into a temp file on the filesystem.
// Using temp file allows us to easily resume uploads, even if the server
// restarts, and to keep the working memory clear.
// callback(err, allBytesLoaded)
FS.File.prototype.saveChunk = function(binary, start, callback) {
  var self = this;
  var total = binary.length;

  if (typeof callback !== "function") {
    throw new Error("FS.File.saveChunk requires a callback");
  }

  // It's a single-chunk upload. No need for temp files.
  if (start === 0 && total === self.size) {
    self.setDataFromBinary(binary);
    callback(null, true);
    return;
  }

  var chunks = self.chunks || [], chunk, tempFile;
  for (var i = 0, ln = chunks.length; i < ln; i++) {
    chunk = chunks[i];
    if (chunk.start === start) {
      tempFile = chunk.tempFile;
      break;
    }
  }
  if (!tempFile) {
    console.log("Creating new temp file for", self._id);
    tempFile = tmp.path({suffix: '.bin'});
    self.update({$push: {chunks: {start: start, tempFile: tempFile}}});
    console.log("Create new temp file", tempFile);
  }

  // Call node writeFile
  fs.writeFile(tempFile, binaryToBuffer(binary), Meteor.bindEnvironment(function(err) {
    if (err) {
      callback(err);
    } else {
      self.update({$inc: {bytesUploaded: total}}, function(err) {
        if (err) {
          callback(err);
        } else {
          console.log("Uploaded " + self.bytesUploaded + " of " + self.size + " bytes");
          if (self.bytesUploaded === self.size) {
            // We are done loading all bytes
            // so we should load the temp files into the actual fsFile now
            self.setDataFromTempFiles(function(err) {
              if (err) {
                callback(err);
              } else {
                callback(null, true);
              }
            });
          }
        }
      });
    }
  }, function(err) {
    callback(err);
  }));
};

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

// callback(err)
FS.File.prototype.saveDataToTempFile = function(callback) {
  var self = this;
  self.saveChunk(self.getBinary(), 0, callback);
};

// callback(err)
FS.File.prototype.deleteTempFiles = function(callback) {
  var self = this, stop = false, count, deletedCount = 0;

  if (!self.chunks) {
    callback();
    return;
  }

  var count = self.chunks.length;
  if (!count) {
    callback();
    return;
  }

  function success() {
    deletedCount++;
    if (deletedCount === count) {
      self.update({$unset: {chunks: 1}});
      callback();
    }
  }

  _.each(self.chunks, function(chunk) {
    if (!stop) {
      fs.unlink(chunk.tempFile, Meteor.bindEnvironment(function(err) {
        console.log("deleted temp file ", chunk.tempFile);
        if (err) {
          callback(err);
          stop = true;
        } else {
          success();
        }
      }, function(err) {
        callback(err);
        stop = true;
      }));
    }
  });
};

// If copyName isn't a string, will log the failure to master
FS.File.prototype.logCopyFailure = function(copyName) {
  var self = this, currentCount, collection, maxTries;

  self.useCollection('FS.File logCopyFailure of _id: "' + self._id + '"', function() {
    collection = this.files;
  });

  var now = new Date;
  if (typeof copyName === "string") {
    copyName = "copies." + copyName;
    currentCount = (self.failures && self.failures.copies && self.failures.copies[copyName] && typeof self.failures.copies[copyName].count === "number") ? self.failures.copies[copyName].count : 0;
    maxTries = collection.options.copies[copyName].maxTries;
  } else {
    copyName = "master";
    currentCount = (self.failures && self.failures.master && typeof self.failures.master.count === "number") ? self.failures.master.count : 0;
    maxTries = collection.options.maxTries;
    if (currentCount + 1 >= maxTries) {
      // we're done trying and this is the master, so we should delete the file
      // from the CFS and quit
      self.remove();
      return;
    } else {
      // Make sure we have a temporary file saved since we will be
      // trying the save again.
      self.saveBufferToTempFile(function(err) {
        if (err) {
          console.log("Error saving temp file for later master attempts:", err);
        }
      });
    }
  }

  var modifier = {};
  modifier.$set = {};
  modifier.$set['failures.' + copyName + '.lastAttempt'] = now;
  if (currentCount === 0) {
    modifier.$set['failures.' + copyName + '.firstAttempt'] = now;
  }
  modifier.$set['failures.' + copyName + '.count'] = currentCount + 1;
  modifier.$set['failures.' + copyName + '.doneTrying'] = (currentCount + 1 >= maxTries);
  self.update(modifier);
};

FS.File.prototype.failedPermanently = function(copyName) {
  var self = this;
  if (typeof copyName === "string") {
    return (self.failures
            && self.failures.copies
            && self.failures.copies[copyName]
            && self.failures.copies[copyName].doneTrying);
  } else {
    return (self.failures
            && self.failures.master
            && self.failures.master.doneTrying);
  }
};

// Load data from a local path into a new FS.File and pass it to callback
// callback(err, fsFile)
FS.File.fromFile = function(filePath, filename, callback) {
  callback = callback || defaultCallback;
  filename = filename || path.basename(filePath);
  var fsFile = new FS.File({name: filename});
  fsFile.setDataFromFile(filePath, function(err) {
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