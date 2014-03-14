if (Meteor.isServer) {
  var mime = Npm.require('mime');
}

/**
 * @method FS.Data
 * @namespace FS.Data
 * @public
 * @constructor
 * @param {File|Blob|Buffer|ArrayBuffer|Uint8Array|String} data The data that you want to manipulate.
 * @param {String} [type] The data content (MIME) type, if known. Required if the first argument is a Buffer, ArrayBuffer, Uint8Array, or URL
 */
FS.Data = function(data, type) {
  var self = this;

  // The end result of all this is that we will have one of the following set:
  // - self.blob
  // - self.buffer
  // - self.dataUri
  // - self.url
  // - self.filepath
  // Unless we already have in-memory data, we don't load anything into memory
  // and instead rely on obtaining a read stream when the time comes.
  if (typeof File !== "undefined" && data instanceof File) {
    self.blob = data; // File inherits from Blob so this is OK
    self.type = data.type;
  } else if (typeof Blob !== "undefined" && data instanceof Blob) {
    self.blob = data;
    self.type = data.type;
  } else if (typeof Buffer !== "undefined" && data instanceof Buffer) {
    self.buffer = data;
  } else if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
    if (typeof Buffer !== "undefined") {
      self.buffer = new Buffer( new Uint8Array(data) );
      self.type = type;
    } else if (typeof Blob !== "undefined") {
      self.blob = new Blob([data], {type: type});
      self.type = type;
    }
  } else if (EJSON.isBinary(data)) {
    self.buffer = new Buffer( data );
    self.type = type;
  } else if (typeof data === "string") {
    if (data.slice(0, 5) === "data:") {
      self.dataUri = data;
    } else if (data.slice(0, 5) === "http:" || data.slice(0, 6) === "https:") {
      self.url = data;
      self.type = type;
    } else if (Meteor.isServer) {
      self.filepath = data;
      self.type = type || mime.lookup(data);
    } else {
      throw new Error("FS.Data constructor received unrecognized data string");
    }
  } else {
    throw new Error("FS.Data constructor received data that it doesn't support");
  }
};

FS.Data.prototype.size = function fsDataSize() {
  var self = this;
  if (self.blob) return self.blob.size;
  if (self.buffer) return self.buffer.length;
  //XXX we don't know the size of stuff we will stream yet; what to do about this?
  return 0;
};
