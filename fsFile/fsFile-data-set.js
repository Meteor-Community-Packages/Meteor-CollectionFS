/*
 * Common methods for setting binary data
 */
if (Meteor.isServer) {
  var request = Npm.require("request");
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
 * Converts ArrayBuffer or Buffer retrieved from URL to EJSON.binary data
 * and sets it. Asynchronous.
 * @param {string} url
 * @param {function} callback - callback(err)
 * @returns {undefined}
 */
FS.File.prototype.setDataFromUrl = function(url, callback) {
  var self = this;
  callback = callback || defaultCallback;

  // XXX If Meteor PR #1620 is ever released, we can do a single HTTP.get
  // here for both client and server.
  if (Meteor.isClient) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function() {
      self.setDataFromArrayBuffer(xhr.response, this.getResponseHeader('content-type'));
      callback();
    };
    xhr.onerror = function(err) {
      callback(err);
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
        callback(err);
      } else {
        self.setDataFromBuffer(body, res.headers['content-type']);
        callback();
      }
    }, function(err) {
      callback(err);
    }));
  }
};

/*
 * Server methods for setting binary data
 */

if (Meteor.isServer) {
  // Converts Buffer to EJSON.binary data and sets it
  FS.File.prototype.setDataFromBuffer = function(buffer, type) {
    check(buffer, Buffer);
    var self = this;
    self.size = buffer.length;
    self.binary = bufferToBinary(buffer);
    if (type) {
      self.type = '' + type;
    } else if (typeof self.type !== "string") {
      // If we don't know the content type, we can inspect the buffer
      var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
      var detectSync = Meteor._wrapAsync(magic.detect);
      self.type = detectSync(buffer);
    }
  };

  // Loads buffer from filesystem, converts Buffer to EJSON.binary data, and sets it
  // callback(err)
  FS.File.prototype.setDataFromFile = function(filePath, type, callback) {
    var self = this;
    callback = callback || defaultCallback;

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