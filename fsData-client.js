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
    self.blob = dataURItoBlob(self.dataUri, self.type);
    callback(null, self.blob);
  } else if (self.url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', self.url, true);
    xhr.responseType = "blob";
    xhr.onload = function(data) {
      self.blob = xhr.response;
      callback(null, self.blob);
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
        var size = blob.size;
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
  // XXX: We could consider using: URL.createObjectURL(blob);
  // This will create a reference to the blob data instead of a clone
  // This is part of the File API - as the rest - Not sure how to generally
  // support from IE10, FF26, Chrome 31, safari 7, opera 19, ios 6, android 4

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

FS.Data.prototype.size = function fsDataSize(callback) {
  var self = this;

  if (!callback) {
    throw new Error("On the client, FS.Data.size requires a callback");
  }

  if (typeof self._size === "number") {
    return self._size;
  }

  return self.getBlob(function (error, blob) {
    if (error) {
      callback(error);
    } else {
      self._size = blob.size;
      callback(null, blob.size);
    }
  });
};

// XXX Move to Utility in base?
function dataURItoBlob(dataURI, dataTYPE) {
  var str = atob(dataURI.split(',')[1]), array = [];
  for(var i = 0; i < str.length; i++) array.push(str.charCodeAt(i));
  return new Blob([new Uint8Array(array)], {type: dataTYPE});
}
