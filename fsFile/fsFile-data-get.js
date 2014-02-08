/*
 * Common methods for getting binary data
 */

/**
 * Client/Server. Returns true if the FS.File has binary data or a file attached.
 * 
 * 
 * @returns {Boolean}
 */
FS.File.prototype.hasData = function() {
  var self = this;
  return !!(self.binary || self.blob);
};

/**
 * Client/Server. Returns the size/length of the attached file data.
 * 
 * @returns {Number}
 */
FS.File.prototype.dataSize = function() {
  var self = this;
  if (self.binary) {
    return self.binary.length || 0;
  } else if (self.blob) {
    return self.blob.size || 0;
  }
  return 0;
};

/**
 * Client/Server. Passes Uint8Array for the requested data to a callback. On
 * the server, blocks and returns the data if there is no callback.
 * 
 * @param {Number} start - First byte position to read.
 * @param {Number} end - Last byte position to read.
 * @param {Function} callback - Required on the client; optional on the server.
 * @returns {Uint8Array|undefined}
 */
FS.File.prototype.getBinary = function(start, end, callback) {
  var self = this, data = self.binary;

  callback = callback || defaultCallback;

  if (!self.hasData()) {
    callback(new Error("FS.File.getBinary requires loaded data or attached file"));
    return;
  }

  function read(blob) {
    if (typeof FileReader === "undefined") {
      callback(new Error("Browser does not support FileReader"));
      return;
    }

    var reader = new FileReader();
    reader.onload = function(evt) {
      var bin = new Uint8Array(evt.target.result);
      callback(null, bin);
    };
    reader.onerror = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(blob);
  }

  if (typeof start !== "number" || typeof end !== "number") {
    // Return the entire binary data
    if (Meteor.isClient && self.blob) {
      read(self.blob);
    } else {
      callback(null, data);
      return data;
    }
  } else {
    var dl = self.dataSize();
    // Return the requested chunk of binary data
    if (start >= dl) {
      callback(new Error("FS.File getBinary: start position beyond end of data (" + dl + ")"));
      return;
    }
    end = Math.min(dl, end);

    if (Meteor.isClient && self.blob) {
      var slice = self.blob.slice || self.blob.webkitSlice || self.blob.mozSlice;
      if (typeof slice === 'undefined') {
        callback(new Error('Browser does not support File.slice'));
        return;
      }

      var blob = slice.call(self.blob, start, end, self.type);
      read(blob);
    } else if (data) {
      var size = end - start;
      var chunk = EJSON.newBinary(size);
      for (var i = 0; i < size; i++) {
        chunk[i] = data[start + i];
      }
      callback(null, chunk);
      return chunk;
    }
  }
};

/*
 * Client methods for getting binary data
 */

if (Meteor.isClient) {

  /**
   * Returns a Blob object representing the file's data, or undefined if there
   * is no attached data.
   * @returns {Blob}
   */
  FS.File.prototype.getBlob = function() {
    var self = this;
    if (typeof Blob === "undefined") {
      throw new Error("Browser does not support Blobs");
    }
    if (self.blob instanceof Blob) {
      return self.blob;
    } else if (self.binary && self.type) {
      return new Blob([self.binary], {type: self.type});
    }
  };
}

/*
 * Server methods for getting binary data
 */

if (Meteor.isServer) {
  /**
   * Returns a Buffer object representing the file's data, or undefined if there
   * is no attached data.
   * @returns {Buffer}
   */
  FS.File.prototype.getBuffer = function() {
    var self = this;
    if (self.binary) {
      return binaryToBuffer(self.binary);
    }
  };
}