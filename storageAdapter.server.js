// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################

_storageAdapters = {};

FS.StorageAdapter = function(name, options, api) {
  var self = this;

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
    name: name,
    files: new Meteor.Collection(api.typeName + '.' + name, {
      _preventAutopublish: true
    })
  });

  var foCheck = function(fsFile, type) {
    if (!(fsFile instanceof FS.File)) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fsFile');
    }
    if (!fsFile.hasData() && (type === "insert" || type === "update")) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fsFile with data');
    }
  };

  var getFileId = function(fsFile) {
    // Make sure our file record is updated
    fsFile.getFileRecord();

    if (!fsFile.copies) {
      return null;
    }
    var copyInfo = fsFile.copies[self.name];
    if (!copyInfo) {
      return null;
    }
    return copyInfo._id;
  };

  function cloneFO(fsFile) {
    var fsFileClone = fsFile.clone();
    fsFileClone.setDataFromBinary(fsFile.getBinary());
    return fsFileClone;
  }

  //internal
  self._insertAsync = function(fsFile, callback) {
    // insert the file ref into the SA file record
    self.files.insert({createdAt: new Date(), size: fsFile.size}, function(err, id) {
      // prep a function to remove the SA file record we just created if storage fails
      function removeFileRecord() {
        self.files.remove({_id: id});
      }

      // construct the filename
      var preferredFilename = fsFile.name;

      // Call the beforeSave function provided by the user
      if (self.beforeSave) {
        // Get a new copy and a fresh buffer each time in case beforeSave changes anything
        fsFile = cloneFO(fsFile);

        if (self.beforeSave.apply(fsFile) === false) {
          callback(null, false);
          return;
        }
      }

      // Prep file info to be returned (info potentially changed by beforeSave)
      var savedFileInfo = {
        _id: id,
        name: fsFile.name,
        type: fsFile.type,
        size: fsFile.size
      };

      // Put the file to storage
      api.put.call(self, id, preferredFilename, fsFile.getBuffer(), {overwrite: false, type: fsFile.type}, function putCallback(err, fileKey) {
        if (err) {
          removeFileRecord();
          callback(err, null);
        } else if (fileKey) {
          if (self.files.findOne({key: fileKey})) {
            //file key already used
            removeFileRecord();
            callback(new Error("File key " + fileKey + " already saved"));
            return;
          }

          function updateFileAndFinish(updatedAt) {
            self.files.update({_id: id}, {$set: {key: fileKey, updatedAt: updatedAt}}, function(err) {
              savedFileInfo.utime = updatedAt;
              callback(err, err ? null : savedFileInfo);
            });
          }

          // note the file key and updatedAt in the SA file record
          if (typeof api.stats === "function") {
            api.stats.call(self, fileKey, function(err, stats) {
              if (err) {
                callback(err, null);
              } else {
                updateFileAndFinish(stats.mtime);
              }
            });
          } else {
            updateFileAndFinish(new Date);
          }
        }
      });
    });

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
    FS.debug && console.log("---SA INSERT");
    foCheck(fsFile, "insert");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    if (callback) {
      return self._insertAsync(fsFile, callback);
    } else {
      return self._insertSync(fsFile);
    }
  };

  //internal
  self._updateAsync = function(fsFile, callback) {

    var id = getFileId(fsFile);
    var fileInfo = self.files.findOne({_id: id});

    if (!fileInfo) {
      callback(new Error('Storage Adapter Update: The "' + self.name + '" store does not contain a file with ID ' + id), false);
      return;
    }

    // Call the beforeSave function provided by the user
    if (self.beforeSave) {
      // Get a new copy and a fresh buffer each time in case beforeSave changes anything
      fsFile = cloneFO(fsFile);

      if (self.beforeSave.apply(fsFile) === false) {
        callback(null, false);
        return;
      }
    }

    // Prep file info to be returned (info potentially changed by beforeSave)
    var savedFileInfo = {
      _id: id,
      name: fsFile.name,
      type: fsFile.type,
      size: fsFile.size
    };

    // Put the file to storage
    api.put.call(self, id, fileInfo.key, fsFile.getBuffer(), {overwrite: true, type: fsFile.type}, function putCallback(err, fileKey) {
      if (err) {
        callback(err, null);
      } else if (fileKey) {

        function updateFileAndFinish(updatedAt) {
          self.files.update({_id: id}, {$set: {updatedAt: updatedAt}}, function(err) {
            savedFileInfo.utime = updatedAt;
            callback(err, err ? null : savedFileInfo);
          });
        }

        // note the file key and updatedAt in the SA file record
        if (typeof api.stats === "function") {
          api.stats.call(self, fileKey, function(err, stats) {
            if (err) {
              callback(err, null);
            } else {
              updateFileAndFinish(stats.mtime);
            }
          });
        } else {
          updateFileAndFinish(new Date);
        }
      }
    });

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

    var id = getFileId(fsFile);
    var fileInfo = self.files.findOne({_id: id});

    if (!fileInfo) {
      if (options.ignoreMissing) {
        callback(null, true);
      } else {
        callback(new Error('Storage Adapter Remove: The "' + self.name + '" store does not contain a file with ID ' + id), false);
      }
      return;
    }

    // remove the file from the store
    api.del.call(self, fileInfo.key, function(err, result) {
      if (err) {
        callback(err, false);
      } else {
        // remove the SA file record
        self.files.remove({_id: fileInfo._id}, function(err, result) {
          callback(err, !err);
        });
      }
    });
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
    var id = getFileId(fsFile);
    var fileInfo = self.files.findOne({_id: id});

    if (!fileInfo) {
      callback(new Error('Storage Adapter GetBuffer: The "' + self.name + '" store does not contain a file with ID ' + id), null);
      return;
    }

    // get the buffer
    api.get.call(self, fileInfo.key, callback);
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
      var id = getFileId(fsFile);
      var fileInfo = self.files.findOne({_id: id});

      if (!fileInfo) {
        callback(new Error('Storage Adapter GetBytes: The "' + self.name + '" store does not contain a file with ID ' + id), null);
        return;
      }

      end = Math.min(end, fileInfo.size);

      // get the buffer
      api.getBytes.call(self, fileInfo.key, start, end, callback);
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

  self.defineSyncCallbacks = function(callbacks) {
    // This is intended to be called one time in the FS.Collection constructor

    if (!self.sync)
      return; //no error thrown so that FS.Collection constructor can call blindly

    callbacks = _.extend({
      insert: null,
      update: null,
      remove: null
    }, callbacks);

    // TODO this is currently not usable; need to filter out changes that we make
    return; // remove this when fixed

    api.watch && api.watch.call(self, function(type, fileKey, info) {
      var fileInfo = self.files.findOne({key: fileKey});
      if (fileInfo) {
        if (type === "remove") {
          callbacks.remove && callbacks.remove(fileKey);
        } else { //changed
          // Compare the updated date of the watched file against the one
          // recorded in our files collection. If they match, then we changed
          // this file, so we don't need to do anything. If they don't match,
          // then this is an outside change that we need to sync.
          // TODO does not work because watcher usually sees file before
          // fileInfo.updateAt is set?
          if (fileInfo.updatedAt && fileInfo.updatedAt.getTime() === info.utime.getTime()) {
            FS.debug && console.log("Update is not external; will not sync");
            return;
          }
          self.files.update({_id: fileInfo._id}, {$set: {updatedAt: info.utime}});
          callbacks.update && callbacks.update(fileInfo._id, info);
        }
      } else {
        api.get.call(self, fileKey, function(err, buffer) {
          if (buffer) {
            // Insert information about this file into the storage adapter collection
            var filesId = self.files.insert({key: fileKey, createdAt: info.utime});
            filesId && callbacks.update && callbacks.update(filesId, info, buffer);
          }
        });
      }
    });
  };

  if (typeof api.init === 'function') {
    api.init.call(self);
  }

  // // Functions to overwrite
  // // These functions will perform the actual storage actions

  // This should be overwritten by new storage adapters - this is for namespacing
  // storage adapters

  // self.typeName = 'storage.filesystem'

  // // Save / Overwrite the data
  // api.put = function(id, preferredFilename, buffer, callback) {};

  // // Return the buffer
  // api.get = function(fileKey, callback) {};

  // // Return part of the buffer (SA need not support)
  // api.getBytes = function(fileKey, start, end, callback) {};

  // // Delete the file data
  // api.del = function(fileKey, callback) {};

  // // File stats returns size, ctime, mtime
  // api.stats = function(fileKey, callback) {}

  // // For external syncing, should accept a callback function
  // // and invoke that function when files in the store change,
  // // passing a string "remove" or "change" as the first argument,
  // // the file key as the second argument, and an object with updated
  // // file info as the third argument.
  // api.watch = function(callback) {};

};