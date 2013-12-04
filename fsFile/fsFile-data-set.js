/*
 * Common methods for setting binary data
 */

// Sets EJSON.binary data directly
FS.File.prototype.setDataFromBinary = function(binary) {
  if (EJSON.isBinary(binary)) {
    this.binary = binary;
  } else {
    throw new Error("setDataFromBinary: Invalid argument")
  }
};

// Converts ArrayBuffer to EJSON.binary data and sets it
FS.File.prototype.setDataFromArrayBuffer = function(arrayBuffer) {
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
};

/*
 * Client methods for setting binary data
 */

if (Meteor.isClient) {
  // Converts Blob to EJSON.binary data and sets it
  // callback(err)
  FS.File.prototype.setDataFromBlob = function(blob, callback) {
    check(blob, Blob);
    var self = this;
    if (typeof FileReader === "undefined") {
      callback(new Error("Browser does not support FileReader"));
      return;
    }

    var reader = new FileReader();
    reader.onload = function() {
      self.setDataFromArrayBuffer(reader.result);
      callback();
    };
    reader.onError = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(blob);
  };

  // Converts ArrayBuffer retrieved from URL to EJSON.binary data and sets it
  // callback(err)
  FS.File.prototype.setDataFromUrl = function(url, callback) {
    var self = this;
    callback = callback || defaultCallback;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function() {
      self.setDataFromArrayBuffer(xhr.response);
      callback();
    };
    xhr.onerror = function(err) {
      callback(err);
    };
    xhr.send();
  };
}

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
  FS.File.prototype.setDataFromFile = function(filePath, callback) {
    var self = this;

    // Call node readFile
    fs.readFile(filePath, Meteor.bindEnvironment(function(err, buffer) {
      console.log("got buffer from temp file", buffer.length);
      if (buffer) {
        self.setDataFromBuffer(buffer);
      }
      callback(err);
    }, function(err) {
      callback(err);
    }));
  };

  // callback(err)
  FS.File.prototype.setDataFromTempFile = function(callback) {
    var self = this;

    if (self.tempFile) {
      self.setDataFromFile(self.tempFile, callback);
    } else {
      callback(new Error("setDataFromTempFile: No temp file"));
    }
  };
}