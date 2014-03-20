var request = Npm.require("request");
var fs = Npm.require("fs");
var sbs = Npm.require('simple-bufferstream')

function _getBuffer(self, callback) {
  if (self.buffer) {
    callback(null, self.buffer);
  } else if (self.dataUri) {
    var data = self.dataUri.substr(self.dataUri.indexOf('base64') + 7);
    self.buffer = new Buffer(data, 'base64');
    callback(null, self.buffer);
  } else if (self.url) {
    request({
      url: self.url,
      method: "GET",
      encoding: null,
      jar: false
    }, Meteor.bindEnvironment(function(err, res, body) {
      if (err) {
        callback(err);
      } else {
        self.type = res.headers['content-type'];
        self.buffer = body;
        callback(null, body);
      }
    }, function(err) {
      callback(err);
    }));
  } else if (self.filepath) {
    // Call node readFile
    fs.readFile(self.filepath, Meteor.bindEnvironment(function(err, buffer) {
      if (buffer) {
        self.buffer = buffer;
      }
      callback(err, buffer);
    }, function(err) {
      callback(err);
    }));
  }
}

/**
 * @method FS.Data.prototype.getBuffer
 * @public
 * @param {function} [callback] callback(err, buffer)
 * @returns {Buffer|undefined}
 *
 * Returns a Buffer representing this data, or passes the Buffer to a callback.
 */
FS.Data.prototype.getBuffer = function fsDataGetBuffer(callback) {
  if (callback) {
    return _getBuffer(this, callback);
  } else {
    return Meteor._wrapAsync(_getBuffer)(this);
  }
};

/**
 * @method FS.Data.prototype.saveToFile
 * @public
 * @returns {undefined}
 *
 * Saves this data to a filepath on the local filesystem.
 */
FS.Data.prototype.saveToFile = function(filePath) {
  var self = this;

  var buffer = self.getBuffer();
  if (!(buffer instanceof Buffer)) {
    throw new Error("saveToFile: No data or data retrieval error");
  }

  return fs.writeFileSync(filePath, buffer);
};

function _getDataUri(self, callback) {
  if (self.dataUri) {
    callback(null, self.dataUri);
    return;
  }

  var buffer = self.getBuffer();
  if (!buffer || !self.type) {
    callback(new Error("getDataUri requires a buffer loaded in the FS.File and a contentType"));
    return;
  }

  var data_uri_prefix = "data:" + self.type + ";base64,";
  self.dataUri = data_uri_prefix + buffer.toString("base64");
  callback(null, self.dataUri);
}

/**
 * @method FS.Data.prototype.getDataUri
 * @public
 * @param {function} [callback] callback(err, dataUri)
 *
 * If no callback, returns the data URI.
 */
FS.Data.prototype.getDataUri = function(callback) {
  var self = this;

  if (callback) {
    return _getDataUri(self, callback);
  } else {
    return Meteor._wrapAsync(_getDataUri)(self);
  }
};

FS.Data.prototype.createReadStream = function() {
  var self = this;

  if (self.buffer || self.dataUri) {
    return sbs(self.getBuffer());
  } else if (self.url) {
    // Stream from URL
    return request(self.url);
  } else if (self.filepath) {
    // Stream from filesystem
    return fs.createReadStream(self.filepath);
  }
};

FS.Data.prototype.size = function fsDataSize() {
  var self = this;

  if (typeof self._size === "number") {
    return self._size;
  }

  // if filepath, we can get the size without buffering
  if (self.filepath) {
    var stats = fs.statSync(self.filepath);
    if (stats && typeof stats.size === "number") {
      self._size = stats.size;
      return self._size;
    }
  }

  self._size = self.getBuffer().length;
  return self._size;
};
