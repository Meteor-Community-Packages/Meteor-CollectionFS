/**
 * @method FS.Data.prototype.getBlob
 * @public
 * @param {Function} callback - callback(error, blob)
 * @returns {undefined}
 *
 * Passes a Blob representing this data to a callback.
 */
FS.Data.prototype.getBlob = function (callback) {
  var self = this;
  if (self.blob) {
    callback(null, self.blob);
  } else if (self.dataUri) {

  } else if (self.url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', self.url, true);
    xhr.responseType = "blob";
    xhr.onload = function(data) {
      self.blob = data;
      callback(null, data);
    };
    xhr.onerror = function(err) {
      callback(err);
    };
    xhr.send();
  }
};

/**
 * @method FS.Data.prototype.getBinary
 * @public
 * @param {Number} [start] - First byte position to read.
 * @param {Number} [end] - Last byte position to read.
 * @param {Function} callback - callback(error, binaryData)
 * @returns {undefined}
 *
 * Passes a Uint8Array representing this data to a callback.
 */
FS.Data.prototype.getBinary = function fsDataGetBinary(start, end, callback) {
  var self = this;

  if (typeof start === "function") {
    callback = start;
  }
  callback = callback || FS.Utility.defaultCallback;

  function read(blob) {
    if (typeof FileReader === "undefined") {
      callback(new Error("Browser does not support FileReader"));
      return;
    }

    var reader = new FileReader();
    reader.onload = function(evt) {
      callback(null, new Uint8Array(evt.target.result));
    };
    reader.onerror = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(blob);
  }

  self.getBlob(function (error, blob) {
    if (error) {
      callback(error);
    } else {
      if (typeof start === "number" && typeof end === "number") {
        var size = self.size();
        // Return the requested chunk of binary data
        if (start >= size) {
          callback(new Error("FS.File getBinary: start position beyond end of data (" + size + ")"));
          return;
        }
        end = Math.min(size, end);

        var slice = blob.slice || blob.webkitSlice || blob.mozSlice;
        if (typeof slice === 'undefined') {
          callback(new Error('Browser does not support File.slice'));
          return;
        }

        read(slice.call(blob, start, end, self.type));
      } else {
        // Return the entire binary data
        read(blob);
      }
    }
  });

};

/** @method FS.Data.prototype.saveAs
 * @public
 * @param {String} [filename]
 * @return {undefined}
 *
 * Tells the browser to save the data like a normal downloaded file,
 * using the provided filename.
 *
 */
FS.Data.prototype.saveAs = function fsDataSaveAs(filename) {
  var self = this;

  if (typeof window === "undefined")
    throw new Error("window must be defined to use saveLocal");

  self.getBlob(function (error, blob) {
    if (error) {
      throw error;
    } else {
      window.saveAs(blob, filename);
    }
  });
};

/**
 * @method FS.Data.prototype.getDataUri
 * @public
 * @param {function} callback callback(err, dataUri)
 */
FS.Data.prototype.getDataUri = function(callback) {
  var self = this;

  if (typeof callback !== 'function')
    throw new Error("getDataUri requires callback function");

  if (typeof FileReader === "undefined") {
    callback(new Error("Browser does not support FileReader"));
    return;
  }

  var fileReader = new FileReader();
  fileReader.onload = function(event) {
    self.dataUri = event.target.result;
    callback(null, self.dataUri);
  };
  fileReader.onerror = function(err) {
    callback(err);
  };

  self.getBlob(function (error, blob) {
    if (error) {
      callback(error);
    } else {
      fileReader.readAsDataURL(blob);
    }
  });
};
