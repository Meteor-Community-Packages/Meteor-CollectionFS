/*
 * Common methods for setting binary data
 */
if (Meteor.isServer) {
  var request = Npm.require("request");
  var mime = Npm.require('mime');
}

// Sets EJSON.binary data directly
FS.File.prototype.setDataFromBinary = function(binary, type) {
  var self = this;
  if (EJSON.isBinary(binary)) {
    self.binary = binary;
    self.size = binary.length;
    if (type) {
      self.type = '' + type;
    }
  } else {
    throw new Error("setDataFromBinary: Invalid argument")
  }
};

// Converts ArrayBuffer to EJSON.binary data and sets it
FS.File.prototype.setDataFromArrayBuffer = function(arrayBuffer, type) {
  if (Meteor.isClient && typeof ArrayBuffer === "undefined") {
    throw new Error("Browser does not support ArrayBuffer");
  }
  check(arrayBuffer, ArrayBuffer);
  var self = this;
  var arrayBufferView = new Uint8Array(arrayBuffer);
  var len = arrayBuffer.byteLength;
  self.binary = EJSON.newBinary(len);
  for (var i = 0; i < len; i++) {
    self.binary[i] = arrayBufferView[i];
  }
  self.size = len;
  if (type) {
    self.type = '' + type;
  }
};

/**
 * @method setDataFromUrl
 * @private
 * @param {FS.File} fileObj The file object
 * @param {String} url The URL
 * @param {Function} callback - callback(err, fileObj)
 * @returns {undefined}
 * 
 * Converts ArrayBuffer or Buffer retrieved from URL to EJSON.binary data
 * and sets it. Asynchronous.
 */
setDataFromUrl = function(fileObj, url, callback) {
  // XXX If Meteor PR #1620 is ever released, we can do a single HTTP.get
  // here for both client and server.
  if (Meteor.isClient) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function() {
      fileObj.setDataFromArrayBuffer(xhr.response, this.getResponseHeader('content-type'));
      callback(null, fileObj);
    };
    xhr.onerror = function(err) {
      callback(err, fileObj);
    };
    xhr.send();
  } else {
    request({
      url: url,
      method: "GET",
      encoding: null,
      jar: false
    }, Meteor.bindEnvironment(function(err, res, body) {
      if (err) {
        callback(err, fileObj);
      } else {
        fileObj.setDataFromBuffer(body, res.headers['content-type']);
        callback(null, fileObj);
      }
    }, function(err) {
      callback(err, fileObj);
    }));
  }
};

/*
 * Client methods for setting binary data
 */

if (Meteor.isClient) {
  /**
   * Converts ArrayBuffer or Buffer retrieved from URL to EJSON.binary data
   * and sets it. Asynchronous.
   * @param {string} url
   * @param {function} callback - callback(err)
   * @returns {undefined}
   */
  FS.File.prototype.setDataFromUrl = function(url, callback) {
    var self = this;
    return setDataFromUrl(self, url, callback || FS.Utility.defaultCallback);
  };
}

/*
 * Server methods for setting binary data
 */

if (Meteor.isServer) {
  /**
   * Converts ArrayBuffer or Buffer retrieved from URL to EJSON.binary data
   * and sets it. Sychronous if no callback is passed.
   * @param {string} url
   * @param {function} [callback] - callback(err)
   * @returns {undefined}
   */
  FS.File.prototype.setDataFromUrl = function(url, callback) {
    var self = this;
    if (callback) {
      return setDataFromUrl(self, url, callback);
    } else {
      return Meteor._wrapAsync(setDataFromUrl)(self, url);
    }
  };

  /**
   * Converts Buffer to EJSON.binary data and sets it
   *
   * @param {Buffer} buffer - A Node buffer
   * @param {string} type - The content type of the data that's in the buffer
   * @returns {undefined}
   */
  FS.File.prototype.setDataFromBuffer = function(buffer, type) {
    check(buffer, Buffer);
    var self = this;
    self.size = buffer.length;
    self.binary = FS.Utility.bufferToBinary(buffer);
    if (type) {
      self.type = '' + type;
    } else if (typeof self.type !== "string") {
      throw new Error('setDataFromBuffer requires a content type');
    }
  };

  /**
   * Loads buffer from filesystem, converts Buffer to EJSON.binary data, and sets it
   *
   * @param {string} filePath - The path to the file on the server filesystem.
   * @param {string} [type="guessed from extension"] - The content type of the file
   * @param {Function} [callback] - A callback that is potentially passed any error.
   * @returns {undefined}
   */
  FS.File.prototype.setDataFromFile = function(filePath, type, callback) {
    var self = this;
    if (typeof type === "function") {
      callback = type;
      type = null;
    }
    callback = callback || FS.Utility.defaultCallback;
    type = type || mime.lookup(filePath);
    // Call node readFile
    fs.readFile(filePath, Meteor.bindEnvironment(function(err, buffer) {
      if (buffer) {
        self.setDataFromBuffer(buffer, type);
      }
      callback(err);
    }, function(err) {
      callback(err);
    }));
  };
}
