var fs = Npm.require("fs");

/**
 * @method DataMan
 * @public
 * @constructor
 * @param {Buffer|ArrayBuffer|Uint8Array|String} data The data that you want to manipulate.
 * @param {String} [type] The data content (MIME) type, if known. Required if the first argument is a Buffer, ArrayBuffer, Uint8Array, or URL
 */
DataMan = function DataMan(data, type) {
  var self = this;

  // The end result of all this is that we will have this.source set to a correct
  // data type handler. We are simply detecting what the data arg is.
  //
  // Unless we already have in-memory data, we don't load anything into memory
  // and instead rely on obtaining a read stream when the time comes.
  if (typeof Buffer !== "undefined" && data instanceof Buffer) {
    self.source = new DataMan.Buffer(data, type);
  } else if (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) {
    if (typeof Buffer === "undefined") {
      throw new Error("Buffer support required to handle an ArrayBuffer");
    }
    var buffer = new Buffer(new Uint8Array(data));
    self.source = new DataMan.Buffer(buffer, type);
  } else if (EJSON.isBinary(data)) {
    if (typeof Buffer === "undefined") {
      throw new Error("Buffer support required to handle an ArrayBuffer");
    }
    var buffer = new Buffer(data);
    self.source = new DataMan.Buffer(buffer, type);
  } else if (typeof data === "string") {
    if (data.slice(0, 5) === "data:") {
      self.source = new DataMan.DataURI(data);
    } else if (data.slice(0, 5) === "http:" || data.slice(0, 6) === "https:") {
      self.source = new DataMan.URL(data, type);
    } else {
      // assume it's a filepath
      self.source = new DataMan.FilePath(data, type);
    }
  } else {
    throw new Error("DataMan constructor received data that it doesn't support");
  }
};

/**
 * @method DataMan.prototype.getBuffer
 * @public
 * @param {function} [callback] callback(err, buffer)
 * @returns {Buffer|undefined}
 *
 * Returns a Buffer representing this data, or passes the Buffer to a callback.
 */
DataMan.prototype.getBuffer = function dataManGetBuffer(callback) {
  var self = this;
  return callback ? self.source.getBuffer(callback) : Meteor._wrapAsync(_.bind(self.source.getBuffer, self.source))();
};

/**
 * @method DataMan.prototype.saveToFile
 * @public
 * @returns {undefined}
 *
 * Saves this data to a filepath on the local filesystem.
 */
DataMan.prototype.saveToFile = function dataManSaveToFile(filePath) {
  var self = this;

  var buffer = self.getBuffer();
  if (!(buffer instanceof Buffer)) {
    throw new Error("DataMan.saveToFile: No data or data retrieval error");
  }

  return fs.writeFileSync(filePath, buffer);
};

/**
 * @method DataMan.prototype.getDataUri
 * @public
 * @param {function} [callback] callback(err, dataUri)
 *
 * If no callback, returns the data URI.
 */
DataMan.prototype.getDataUri = function dataManGetDataUri(callback) {
  var self = this;
  return callback ? self.source.getDataUri(callback) : Meteor._wrapAsync(_.bind(self.source.getDataUri, self.source))();
};

/**
 * @method DataMan.prototype.createReadStream
 * @public
 *
 * Returns a read stream for the data.
 */
DataMan.prototype.createReadStream = function dataManCreateReadStream() {
  return this.source.createReadStream();
};

/**
 * @method DataMan.prototype.size
 * @public
 * @param {function} [callback] callback(err, size)
 *
 * If no callback, returns the size in bytes of the data.
 */
DataMan.prototype.size = function dataManSize(callback) {
  var self = this;
  return callback ? self.source.size(callback) : Meteor._wrapAsync(_.bind(self.source.size, self.source))();
};

/**
 * @method DataMan.prototype.type
 * @public
 *
 * Returns the type of the data.
 */
DataMan.prototype.type = function dataManType() {
  return this.source.type();
};
