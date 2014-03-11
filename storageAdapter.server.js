// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################
_storageAdapters = {};

FS.StorageAdapter = function(name, options, api) {
  var self = this;

  // If name is the only argument, a string and the SA allready found
  // we will just return that SA
  if (arguments.length === 1 && name === '' + name &&
          typeof _storageAdapters[name] !== 'undefined')
    return _storageAdapters[name];

  // Check the api
  if (typeof api === 'undefined') {
    throw new Error('FS.StorageAdapter please define an api');
  }

  _.each('get,put,del,typeName,createReadStream,createWriteStream'.split(','), function(name) {
    if (typeof api[name] === 'undefined') {
      throw new Error('FS.StorageAdapter please define an api.' + name + '');
    }
  });

  // store reference for easy lookup by name
  if (typeof _storageAdapters[name] !== 'undefined') {
    throw new Error('Storage name already exists: "' + name + '"');
  } else {
    _storageAdapters[name] = self;
  }

  // extend self with options and other info
  _.extend(this, options || {}, {
    name: name
  });

  var foCheck = function(fsFile, type) {
    if (!(fsFile instanceof FS.File)) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fsFile');
    }
    if (!fsFile.hasData() && (type === "insert" || type === "update")) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fsFile with data');
    }
  };

  function doPut(fsFile, overwrite, callback) {

    // Prep file info to be returned
    var savedFileInfo = {
      name: fsFile.name,
      type: fsFile.type,
      size: fsFile.size
    };

    // Create callback for store `put` method
    function putCallback(err, finalFileKey) {
      if (err) {
        callback(err, null);
      } else if (!finalFileKey) {
        callback(new Error("No file key"), null);
      } else {

        function finish(updatedAt) {
          savedFileInfo.key = finalFileKey;
          savedFileInfo.utime = updatedAt;
          callback(err, err ? null : savedFileInfo);
        }

        // note the file key and updatedAt in the SA file record
        if (typeof api.stats === "function") {
          api.stats.call(self, finalFileKey, function(err, stats) {
            if (err) {
              callback(err, null);
            } else {
              finish(stats.mtime);
            }
          });
        } else {
          finish(new Date);
        }
      }
    }

    // Put the file to storage
    api.put.call(self, fsFile, {overwrite: overwrite}, putCallback);
  }

  // Create a nicer abstracted adapter interface
  self.adapter = {};

  // Return readable stream
  self.adapter.createReadStream = function(fileObj, options) {
    FS.debug && console.log('createReadStream ' + self.name);

    return FS.Utility.safeStream( api.createReadStream.call(self, fileObj, options) );

  };

  // Return readable stream
  self.adapter.createWriteStream = function(fileObj, options) {

    FS.debug && console.log('createWriteStream ' + self.name);

    if (typeof fileObj.copies == 'undefined' || fileObj.copies === null) {
      fileObj.copies = {};
    }
    if (typeof fileObj.copies[self.name] === 'undefined') {
      fileObj.copies[self.name] = {
        name: fileObj.name,
        type: fileObj.type,
        size: fileObj.size
      };
    }

    return FS.Utility.safeStream(api.createWriteStream.call(self, fileObj, options) );
  };

  //internal
  self._insertAsync = function(fsFile, callback) {
    return doPut(fsFile, false, callback);
  };

  /**
   * @method FS.StorageAdapter.prototype.insert
   * @public
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] Options (currently unused)
   * @param {Function} [callback] If not provided, will block and return file info.
   * @deprecated Use streams api instead
   *
   * Attempts to insert a file into the store. If there is a temporary failure,
   * returns (or passes to the second argument of the callback) `null`. If there
   * is a permanant failure, returns or passes `false`. If the file is
   * successfully stored, returns an object with file info that the
   * FS.Collection can save.
   */
  self.insert = function(fsFile, options, callback) {
    foCheck(fsFile, "insert");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    FS.debug && console.log("---SA INSERT callback: " + (typeof callback === 'function'));

    if (callback) {
      return self._insertAsync(fsFile, FS.Utility.safeCallback(callback));
    } else {
      return Meteor._wrapAsync(self._insertAsync)(fsFile);
    }
  };

  //internal
  self._updateAsync = function(fsFile, callback) {
    return doPut(fsFile, true, callback);
  };

  /**
   * @method FS.StorageAdapter.prototype.update
   * @public
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] Options (currently unused)
   * @param {Function} [callback] If not provided, will block and return file info.
   * @deprecated Use streams api instead
   *
   * Attempts to update a file in the store. If there is a temporary failure,
   * returns (or passes to the second argument of the callback) `null`. If there
   * is a permanant failure, returns or passes `false`. If the file is
   * successfully stored, returns an object with file info that the
   * FS.Collection can save.
   */
  self.update = function(fsFile, options, callback) {
    FS.debug && console.log("---SA UPDATE");
    foCheck(fsFile, "update");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    if (callback) {
      return self._updateAsync(fsFile, FS.Utility.safeCallback(callback));
    } else {
      return Meteor._wrapAsync(self._updateAsync)(fsFile);
    }
  };

  //internal
  self._removeAsync = function(fsFile, callback) {
    // Remove the file from the store
    api.del.call(self, fsFile, callback);
  };

  /**
   * @method FS.StorageAdapter.prototype.remove
   * @public
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] unused
   * @param {Function} [callback] If not provided, will block and return true or false
   *
   * Attempts to remove a file from the store. Returns true if removed or not
   * found, or false if the file couldn't be removed.
   */
  self.remove = function(fsFile, options, callback) {
    FS.debug && console.log("---SA REMOVE");
    foCheck(fsFile, "remove");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};

    if (callback) {
      return self._removeAsync(fsFile, FS.Utility.safeCallback(callback));
    } else {
      return Meteor._wrapAsync(self._removeAsync)(fsFile);
    }
  };

  //internal
  self._getBufferAsync = function(fsFile, callback) {
    // get the buffer
    api.get.call(self, fsFile, callback);
  };

  /**
   * @method FS.StorageAdapter.prototype.getBuffer
   * @public
   * @param {FS.File} fsFile The FS.File instance to be retrieved.
   * @param {Object} [options] unused
   * @param {Function} [callback] If not provided, will block and return the Buffer
   * @deprecated Use streams api instead
   *
   * Returns the buffer for a file that has been saved in this store
   */
  self.getBuffer = function(fsFile, options, callback) {
    FS.debug && console.log("---SA GET BUFFER");
    foCheck(fsFile, "getBuffer");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    if (callback) {
      return self._getBufferAsync(fsFile, FS.Utility.safeCallback(callback));
    } else {
      return Meteor._wrapAsync(self._getBufferAsync)(fsFile);
    }
  };

  if (typeof api.getBytes === 'function') {
    //internal
    self._getBytesAsync = function(fsFile, start, end, callback) {
      var copyInfo = fsFile.getCopyInfo(self.name);
      if (!copyInfo) {
        callback(new Error("No file info found for the " + self.name + " store. Can't getBytes."), false);
        return;
      }

      if (copyInfo.size) {
        end = Math.min(end, copyInfo.size);
      }

      // get the buffer
      api.getBytes.call(self, fsFile, start, end, callback);
    };

   /**
    * @method FS.StorageAdapter.prototype.getBytes
    * @public
    * @param {FS.File} fsFile The FS.File instance to be retrieved.
    * @param {Number} start - The position of the first byte to return
    * @param {Number} end - The position of the last byte to return, plus one
    * @param {Object} [options] unused
    * @param {Function} [callback] If not provided, will block and return the Buffer
    * @deprecated Use streams api instead
    *
    * Returns the buffer for one chunk of a file that has been saved in this store
    */
    self.getBytes = function(fsFile, start, end, options, callback) {
      FS.debug && console.log("---SA GET BYTES");
      foCheck(fsFile, "getBytes");

      if (!callback && typeof options === "function") {
        callback = options;
        options = {};
      }

      if (callback) {
        return self._getBytesAsync(fsFile, start, end, FS.Utility.safeCallback(callback));
      } else {
        return Meteor._wrapAsync(self._getBytesAsync)(fsFile, start, end);
      }
    };
  }

  if (typeof api.init === 'function') {
    Meteor._wrapAsync(api.init.bind(self))();
  }

};
