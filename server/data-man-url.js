var request = Npm.require("request");

DataMan.URL = function DataManURL(url, type) {
  var self = this;
  self.url = url;
  self._type = type;
};

/**
 * @method DataMan.URL.prototype.getBuffer
 * @public
 * @param {function} callback callback(err, buffer)
 * @returns {Buffer|undefined}
 *
 * Passes a Buffer representing the data at the URL to a callback.
 */
DataMan.URL.prototype.getBuffer = function dataManUrlGetBuffer(callback) {
  var self = this;

  if (self.buffer) {
    callback(null, self.buffer);
    return;
  }

  request({
    url: self.url,
    method: "GET",
    encoding: null,
    jar: false
  }, Meteor.bindEnvironment(function(err, res, body) {
    if (err) {
      callback(err);
    } else {
      self._type = res.headers['content-type'];
      self.buffer = body;
      callback(null, self.buffer);
    }
  }, function(err) {
    callback(err);
  }));
};

/**
 * @method DataMan.URL.prototype.getDataUri
 * @public
 * @param {function} callback callback(err, dataUri)
 *
 * Passes a data URI representing the data at the URL to a callback.
 */
DataMan.URL.prototype.getDataUri = function dataManUrlGetDataUri(callback) {
  var self = this;

  if (self.dataUri) {
    callback(null, self.dataUri);
    return;
  }

  self.getBuffer(function (error, buffer) {
    if (error) {
      callback(error);
    } else {
      if (!self._type) {
        callback(new Error("DataMan.getDataUri couldn't get a contentType"));
      } else {
        self.dataUri = "data:" + self._type + ";base64," + buffer.toString("base64");
        callback(null, self.dataUri);
      }
    }
  });
};

/**
 * @method DataMan.URL.prototype.createReadStream
 * @public
 *
 * Returns a read stream for the data.
 */
DataMan.URL.prototype.createReadStream = function dataManUrlCreateReadStream() {
  // Stream from URL
  return request(this.url);
};

/**
 * @method DataMan.URL.prototype.size
 * @param {function} callback callback(err, size)
 * @public
 *
 * Returns the size in bytes of the data at the URL.
 */
DataMan.URL.prototype.size = function dataManUrlSize(callback) {
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
 * @method DataMan.URL.prototype.type
 * @public
 *
 * Returns the type of the data.
 */
DataMan.URL.prototype.type = function dataManUrlType() {
  return this._type;
};
