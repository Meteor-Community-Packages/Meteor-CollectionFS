var sbs = Npm.require('simple-bufferstream');

DataMan.DataURI = function DataManDataURI(dataUri) {
  var self = this;
  self.dataUri = dataUri;
  self._type = dataUri.slice(5, dataUri.indexOf(';'));
};

/**
 * @method DataMan.DataURI.prototype.getBuffer
 * @private
 * @param {function} callback callback(err, buffer)
 * @returns {Buffer|undefined}
 *
 * Passes a Buffer representing the data to a callback.
 */
DataMan.DataURI.prototype.getBuffer = function dataManDataURIGetBuffer(callback) {
  var self = this;

  if (self.buffer) {
    callback(null, self.buffer);
    return;
  }

  var data = self.dataUri.substr(self.dataUri.indexOf('base64') + 7);
  self.buffer = new Buffer(data, 'base64');
  callback(null, self.buffer);
};

/**
 * @method DataMan.DataURI.prototype.getDataUri
 * @private
 * @param {function} callback callback(err, dataUri)
 *
 * Passes a data URI representing the data to a callback.
 */
DataMan.DataURI.prototype.getDataUri = function dataManDataURIGetDataUri(callback) {
  callback(null, this.dataUri);
};

/**
 * @method DataMan.DataURI.prototype.createReadStream
 * @private
 *
 * Returns a read stream for the data.
 */
DataMan.DataURI.prototype.createReadStream = function dataManDataURICreateReadStream() {
  return sbs(Meteor._wrapAsync(this.getBuffer)());
};

/**
 * @method DataMan.DataURI.prototype.size
 * @param {function} callback callback(err, size)
 * @private
 *
 * Passes the size in bytes of the data to a callback.
 */
DataMan.DataURI.prototype.size = function dataManDataURISize(callback) {
  var self = this;

  if (typeof self._size === "number") {
    callback(null, self._size);
    return;
  }

  self.getBuffer(function (error, buffer) {
    if (error) {
      callback(error);
    } else {
      self._size = buffer.length;
      callback(null, self._size);
    }
  });
};

/**
 * @method DataMan.DataURI.prototype.type
 * @private
 *
 * Returns the type of the data.
 */
DataMan.DataURI.prototype.type = function dataManDataURIType() {
  return this._type;
};
