// Save a chunk of the total binary data into a temp file on the filesystem.
// Using temp file allows us to easily resume uploads, even if the server
// restarts, and to keep the working memory clear.
// callback(err, allBytesLoaded)
FS.File.prototype.loadBinaryChunk = function(binary, start, callback) {
  var self = this;
  var total = binary.length;

  if (typeof callback !== "function") {
    throw new Error("FS.File.loadBinaryChunk requires a callback");
  }

  self.openTempFile(function(err, fd) {
    if (err) {
      callback(err);
      return;
    }

    try {
      fs.writeSync(fd, binaryToBuffer(binary), 0, total, start);
      fs.closeSync(fd);
    } catch (err) {
      callback(err);
      return;
    }

    var mod;
    if (start === 0) {
      mod = {$set: {bytesUploaded: total}};
    } else {
      mod = {$inc: {bytesUploaded: total}};
    }

    self.update(mod, function(err) {
      if (err) {
        callback(err);
        return;
      }
      console.log("Uploaded " + self.bytesUploaded + " of " + self.size + " bytes");
      if (self.bytesUploaded === self.size) {
        // We are done loading all bytes
        // so we should load the temp file into the actual fsFile now
        self.setDataFromTempFile(function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, true);
          }
        });
      }
    });
  });
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

  self.openTempFile(function(err, fd) {
    fs.closeSync(fd);
    self.saveDataToFile(self.tempFile, callback);
  });
};

// Either creates a temp file and sets its path in self.tempFile or opens self.tempFile
// for appending.
// callback(err)
FS.File.prototype.openTempFile = function(callback) {
  var self = this;

  if (!self.tempFile) {
    console.log("Creating new temp file for", self._id);
    self.update({$set: {tempFile: "retrieving"}}); //set to this temporarily so that we know not to get another temp file
    tmp.file({keep: true}, Meteor.bindEnvironment(function(err, path, fd) {
      if (err) {
        self.update({$unset: {tempFile: ''}});
        callback(err);
      } else {
        console.log("Created temp file for", self._id, path);
        self.update({$set: {tempFile: path}});
        callback(null, fd);
      }
    }, function(err) {
      callback(err);
    }));
  } else {
    //TODO maybe check for tempFile === "retrieving" here and loop until it equals a filepath?
    fs.open(self.tempFile, 'a', Meteor.bindEnvironment(function(err, fd) {
      if (err) {
        self.update({$unset: {tempFile: ''}});
        callback(err);
      } else {
        console.log("Opened temp file for", self._id, self.tempFile);
        callback(null, fd);
      }
    }, function(err) {
      callback(err);
    }));
  }
};

// callback(err)
FS.File.prototype.deleteTempFile = function(callback) {
  var self = this;

  if (self.tempFile) {
    fs.unlink(self.tempFile, Meteor.bindEnvironment(function(err) {
      console.log("deleted temp file ", self.tempFile);
      if (!err) {
        self.update({$unset: {tempFile: ''}});
      }
      callback(err);
    }, function(err) {
      callback(err);
    }));
  } else {
    callback();
  }
};

// If copyName isn't a string, will log the failure to master
FS.File.prototype.logCopyFailure = function(copyName) {
  var self = this, currentCount, collection, maxTries;

  self.useCollection('FS.File logCopyFailure of _id: "' + self._id + '"', function() {
    collection = this;
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