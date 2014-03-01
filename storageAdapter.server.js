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

  if (typeof api.get !== 'function') {
    throw new Error('FS.StorageAdapter please define an api.get function');
  }

  if (typeof api.put !== 'function') {
    throw new Error('FS.StorageAdapter please define an api.put function');
  }

  if (typeof api.del !== 'function') {
    throw new Error('FS.StorageAdapter please define an api.del function');
  }

  if (api.typeName !== '' + api.typeName) {
    throw new Error('FS.StorageAdapter please define an api.typeName string');
  }

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

  function doPut(fsFile, fileKey, overwrite, callback) {

    // Prep file info to be returned (info potentially changed by beforeSave)
    var savedFileInfo = {
      name: fsFile.name,
      type: fsFile.type,
      size: fsFile.size
    };

    // Prep fileKey if we're not doing an update of an existing file
    fileKey = fileKey || fsFile.name;
    
    // Make callback safe for Meteor code
    var safeCallback = Meteor.bindEnvironment(callback, function(err) {
      throw err;
    });

    // Create callback for store `put` method
    function putCallback(err, finalFileKey) {
      if (err) {
        safeCallback(err, null);
      } else if (!finalFileKey) {
        safeCallback(new Error("No file key"), null);
      } else {

        function finish(updatedAt) {
          savedFileInfo.key = finalFileKey;
          savedFileInfo.utime = updatedAt;
          safeCallback(err, err ? null : savedFileInfo);
        }

        // note the file key and updatedAt in the SA file record
        if (typeof api.stats === "function") {
          api.stats.call(self, finalFileKey, function(err, stats) {
            if (err) {
              safeCallback(err, null);
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
    api.put.call(self, fileKey, fsFile.getBuffer(),
            {overwrite: overwrite, type: fsFile.type}, putCallback);
  }

  //internal
  self._insertAsync = function(fsFile, callback) {
    return doPut(fsFile, null, false, callback);
  };

  //internal
  self._insertSync = Meteor._wrapAsync(self._insertAsync);

  /**
   * Attempts to insert a file into the store, first running the beforeSave
   * function for the store if there is one. If there is a temporary failure,
   * returns (or passes to the second argument of the callback) `null`. If there
   * is a permanant failure or the beforeSave function returns `false`, returns
   * `false`. If the file is successfully stored, returns an object with file
   * info that the FS.Collection can save.
   *
   * Also updates the `files` collection for this store to save info about this
   * file.
   *
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] Options (currently unused)
   * @param {Function} [callback] If not provided, will block and return file info.
   */
  self.insert = function(fsFile, options, callback) {
    foCheck(fsFile, "insert");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    FS.debug && console.log("---SA INSERT callback: " + (typeof callback === 'function'));

    if (callback) {
      return self._insertAsync(fsFile, callback);
    } else {
      return self._insertSync(fsFile);
    }
  };

  //internal
  self._updateAsync = function(fsFile, callback) {
    var copyInfo = fsFile.getCopyInfo(self.name);
    if (!copyInfo || !copyInfo.key) {
      callback(new Error("No file key found for the " + self.name + " store. Can't update."), false);
      return;
    }

    return doPut(fsFile, copyInfo.key, true, callback);
  };

  //internal
  self._updateSync = Meteor._wrapAsync(self._updateAsync);

  /**
   * Attempts to update a file in the store, first running the beforeSave
   * function for the store if there is one. If there is a temporary failure,
   * returns (or passes to the second argument of the callback) `null`. If there
   * is a permanant failure or the beforeSave function returns `false`, returns
   * `false`. If the file is successfully stored, returns an object with file
   * info that the FS.Collection can save.
   *
   * Also updates the `files` collection for this store to save info about this
   * file.
   *
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] Options (currently unused)
   * @param {Function} [callback] If not provided, will block and return file info.
   */
  self.update = function(fsFile, options, callback) {
    FS.debug && console.log("---SA UPDATE");
    foCheck(fsFile, "update");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    if (callback) {
      return self._updateAsync(fsFile, callback);
    } else {
      return self._updateSync(fsFile);
    }
  };

  //internal
  self._removeAsync = function(fsFile, options, callback) {   
    var copyInfo = fsFile.getCopyInfo(self.name);
    if (!copyInfo || !copyInfo.key) {
      if (options.ignoreMissing) {
        callback(null, true);
      } else {
        callback(new Error("No file key found for the " + self.name + " store. Can't remove."), false);
      }
      return;
    }
    
    // Make callback safe for Meteor code
    var safeCallback = Meteor.bindEnvironment(callback, function(err) {
      throw err;
    });

    // Remove the file from the store
    api.del.call(self, copyInfo.key, safeCallback);
  };

  //internal
  self._removeSync = Meteor._wrapAsync(self._removeAsync);

  /**
   * Attempts to remove a file from the store. Returns true if removed, or false.
   *
   * Also removes file info from the `files` collection for this store.
   *
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Object} [options] Options
   * @param {Boolean} [options.ignoreMissing] Set true to treat missing files as a successful deletion. Otherwise throws an error.
   * @param {Function} [callback] If not provided, will block and return true or false
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
      return self._removeAsync(fsFile, options, callback);
    } else {
      return self._removeSync(fsFile, options);
    }
  };

  //internal
  self._getBufferAsync = function(fsFile, callback) {
    var copyInfo = fsFile.getCopyInfo(self.name);
    if (!copyInfo || !copyInfo.key) {
      callback(new Error("No file key found for the " + self.name + " store. Can't get."), false);
      return;
    }
    
    // Make callback safe for Meteor code
    var safeCallback = Meteor.bindEnvironment(callback, function(err) {
      throw err;
    });

    // get the buffer
    api.get.call(self, copyInfo.key, safeCallback);
  };

  //internal
  self._getBufferSync = Meteor._wrapAsync(self._getBufferAsync);

  self.getBuffer = function(fsFile, options, callback) {
    FS.debug && console.log("---SA GET BUFFER");
    foCheck(fsFile, "getBuffer");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    if (callback) {
      return self._getBufferAsync(fsFile, callback);
    } else {
      return self._getBufferSync(fsFile);
    }
  };

  if (typeof api.getBytes === 'function') {
    //internal
    self._getBytesAsync = function(fsFile, start, end, callback) {
      var copyInfo = fsFile.getCopyInfo(self.name);
      if (!copyInfo || !copyInfo.key) {
        callback(new Error("No file key found for the " + self.name + " store. Can't getBytes."), false);
        return;
      }

      if (copyInfo.size) {
        end = Math.min(end, copyInfo.size);
      }
      
      // Make callback safe for Meteor code
      var safeCallback = Meteor.bindEnvironment(callback, function(err) {
        throw err;
      });

      // get the buffer
      api.getBytes.call(self, copyInfo.key, start, end, safeCallback);
    };

    //internal
    self._getBytesSync = Meteor._wrapAsync(self._getBytesAsync);

    self.getBytes = function(fsFile, start, end, options, callback) {
      FS.debug && console.log("---SA GET BYTES");
      foCheck(fsFile, "getBytes");

      if (!callback && typeof options === "function") {
        callback = options;
        options = {};
      }

      if (callback) {
        return self._getBytesAsync(fsFile, start, end, callback);
      } else {
        return self._getBytesSync(fsFile, start, end);
      }
    };
  }

  if (typeof api.init === 'function') {
    api.init.call(self);
  }

};
