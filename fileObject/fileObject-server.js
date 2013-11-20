var fs = Npm.require('fs');
var path = Npm.require('path');
var tmp = Npm.require('tmp');
var mmm = Npm.require('mmmagic');

// Loads the given buffer into myFileObject.buffer
FileObject.prototype.loadBuffer = function(buffer, type) {
  check(buffer, Buffer);
  var self = this;
  self.size = buffer.length;
  self.buffer = buffer;
  if (type) {
    self.type = '' + type;
  } else if (typeof self.type !== "string") {
    // If we don't know the content type, we can inspect the buffer
    var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
    var detectSync = Meteor._wrapAsync(magic.detect);
    self.type = detectSync(buffer);
  }
};

// Save a chunk of the total binary data into a temp file on the filesystem.
// Using temp file allows us to easily resume uploads, even if the server
// restarts, and to keep the working memory clear.
// callback(err, allBytesLoaded)
FileObject.prototype.loadBinaryChunk = function(binary, start, callback) {
  var self = this;
  var total = binary.length;

  if (typeof callback !== "function") {
    throw new Error("FileObject.loadBinaryChunk requires a callback");
  }

  self.openTempFile(function(err, fd) {
    fs.writeSync(fd, binaryToBuffer(binary), 0, total, start);
    fs.closeSync(fd);

    if (start === 0) {
      self.update({$set: {bytesUploaded: total}});
    } else {
      self.update({$inc: {bytesUploaded: total}});
    }

    console.log("Uploaded " + self.bytesUploaded + " of " + self.size + " bytes");

    if (self.bytesUploaded === self.size) {
      // We are done loading all bytes
      // so we should load the temp file into the actual fileObject now
      self.loadBufferFromTempFile(callback);
    }
  });
};

// callback(err)
FileObject.prototype.loadBufferFromFile = function(filePath, callback) {
  var self = this;

  // Call node readFile
  fs.readFile(filePath, Meteor.bindEnvironment(function(err, buffer) {
    console.log("got buffer from temp file", buffer.length);
    if (buffer) {
      self.loadBuffer(buffer);
    }
    callback(err);
  }, function(err) {
    callback(err);
  }));
};

// callback(err)
FileObject.prototype.saveBufferToFile = function(filePath, callback) {
  var self = this;

  if (!(self.buffer instanceof Buffer)) {
    callback(new Error("saveBufferToFile: No buffer"));
  }

  // Call node readFile
  fs.writeFile(filePath, self.buffer, Meteor.bindEnvironment(function(err) {
    console.log("saved entire buffer to temp file");
    callback(err);
  }, function(err) {
    callback(err);
  }));
};

// callback(err)
FileObject.prototype.loadBufferFromTempFile = function(callback) {
  var self = this;

  if (!self.tempFile) {
    callback(new Error("loadBufferFromTempFile: No temp file"));
  }

  self.loadBufferFromFile(self.tempFile, callback);
};

// callback(err)
FileObject.prototype.saveBufferToTempFile = function(callback) {
  var self = this;
  
  self.openTempFile(function (err, fd) {
    fs.closeSync(fd);
    self.saveBufferToFile(self.tempFile, callback);
  });
};

// Either creates a temp file and sets its path in self.tempFile or opens self.tempFile
// for appending.
// callback(err)
FileObject.prototype.openTempFile = function(callback) {
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
FileObject.prototype.deleteTempFile = function(callback) {
  var self = this;

  if (!self.tempFile) {
    callback();
  }

  fs.unlink(self.tempFile, Meteor.bindEnvironment(function(err) {
    console.log("deleted temp file ", self.tempFile);
    if (!err) {
      self.update({$unset: {tempFile: ''}});
    }
    callback(err);
  }, function(err) {
    callback(err);
  }));
};

// If copyName isn't a string, will log the failure to master
FileObject.prototype.logCopyFailure = function(copyName) {
  var self = this, currentCount, collection, maxTries;

  self.useCollection('FileObject logCopyFailure of _id: "' + self._id + '"', function() {
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

FileObject.prototype.failedPermanently = function(copyName) {
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

// Load data from a local path into a new FileObject and pass it to callback
// callback(err, fileObject)
FileObject.fromFile = function(filePath, filename, callback) {
  filename = filename || path.basename(filePath);
  var fileObject = new FileObject({name: filename});
  fileObject.loadBufferFromFile(filePath, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, fileObject);
    }
  });
};