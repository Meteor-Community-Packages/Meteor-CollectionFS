/*
 * Common methods for getting binary data
 */

// Returns true if the FS.File has binary data attached
FS.File.prototype.hasData = function() {
  return !!this.binary;
};

// Gets EJSON.binary data directly
FS.File.prototype.getBinary = function(start, end) {
  var self = this, data = self.binary;
  if (typeof start !== "number" || typeof end !== "number") {
    // Return the entire binary data
    return data;
  } else {
    // Return the requested chunk of binary data
    if (start >= data.length) {
      throw new Error("FS.File getBinary: start position beyond end of data (" + data.length + ")");
    }
    end = (end > data.length) ? data.length : end;
    var size = end - start;
    var chunk = EJSON.newBinary(size);
    for (var i = 0; i < size; i++) {
      chunk[i] = data[start + i];
    }
    return chunk;
  }
};

/*
 * Client methods for getting binary data
 */

if (Meteor.isClient) {
  FS.File.prototype.getBlob = function() {
    var self = this;
    if (self.binary && self.type) {
      return new Blob([self.binary], {type: self.type});
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