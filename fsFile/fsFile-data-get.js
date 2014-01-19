/*
 * Common methods for getting binary data
 */

// Returns true if the FS.File has binary data or a file attached
FS.File.prototype.hasData = function() {
  var self = this;
  return self.binary || self.blob;
};

// Gets EJSON.binary data directly
// Callback is optional on the server
FS.File.prototype.getBinary = function(start, end, callback) {
  var self = this, data = self.binary;

  callback = callback || defaultCallback;

  if (!data && !self.blob) {
    callback(new Error("FS.File.getBinary requires loaded data or attached file"));
    return;
  }

  function read(blob) {
    var reader = new FileReader();
    reader.onloadend = function(evt) {
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
    var dl = 0;
    if (data) {
      dl = data.length;
    } else if (self.blob) {
      dl = self.blob.size;
    }
    // Return the requested chunk of binary data
    if (start >= dl) {
      callback(new Error("FS.File getBinary: start position beyond end of data (" + dl + ")"));
    }
    end = (end > dl) ? dl : end;

    if (Meteor.isClient && self.blob) {
      if (typeof FileReader === "undefined") {
        callback(new Error("Browser does not support FileReader"));
        return;
      }
      
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
  FS.File.prototype.getBlob = function() {
    var self = this, data = self.binary || self.blob;
    if (typeof Blob === "undefined") {
      throw new Error("Browser does not support Blobs");
    }
    if (data && self.type) {
      if (data instanceof Blob) {
        return data;
      }
      return new Blob([data], {type: self.type});
    }
  };
}

/*
 * Server methods for getting binary data
 */

if (Meteor.isServer) {
  FS.File.prototype.getBuffer = function() {
    var self = this;
    if (self.binary) {
      return binaryToBuffer(self.binary);
    }
  };
}