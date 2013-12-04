// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################

var _storageAdapters = {};

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

  // Name of Storage Adapter name
  self.name = api.typeName + '.' + name;

  if (typeof _storageAdapters[self.name] !== 'undefined') {
    throw new Error('Storage name already exists "' + self.name + '"');
  }

  // Make sync versions of some API functions
  api.putSync = Meteor._wrapAsync(api.put);
  api.getSync = Meteor._wrapAsync(api.get);
  api.delSync = Meteor._wrapAsync(api.del);
  if (typeof api.getBytes === "function") {
    api.getBytesSync = Meteor._wrapAsync(api.getBytes);
  }
  if (typeof api.stats === "function") {
    api.statsSync = Meteor._wrapAsync(api.stats);
  }

  // a storage adapter is mounted on a name
  // Default options
  self.options = {};

  // Extend / overwrite default options
  _.extend(self.options, options || {});

  // The default collection implementation
  // This is a list of file information
  // _id, extension, createdAt, updatedAt
  self.files = new Meteor.Collection(self.name);

  var foCheck = function(fsFile, type) {
    if (!(fsFile instanceof FS.File)) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fsFile');
    }
    if (!fsFile.hasData() && (type === "insert" || type === "update")) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fsFile with data');
    }
  };

  var getFileId = function(fsFile, copyName) {
    var copyInfo;
    if (!fsFile.copies) {
      return null;
    }
    if (copyName) {
      copyInfo = fsFile.copies[copyName];
    } else {
      copyInfo = fsFile.master;
    }
    if (!copyInfo) {
      return null;
    }
    return copyInfo._id;
  };

  self.insert = function(fsFile, options, callback) {
    console.log("---SA INSERT");
    foCheck(fsFile, "insert");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};

    // insert the file ref into the SA file record
    var id = self.files.insert({createdAt: new Date()});

    // construct the filename
    var preferredFilename = fsFile.name;

    // Put the file to storage
    // Async
    if (callback) {
      api.put.call(self, id, preferredFilename, fsFile.getBuffer(), {overwrite: false}, function(err, fileKey, updatedAt) {
        if (err) {
          // remove the SA file record
          self.files.remove({_id: id});
          callback(err);
        } else if (fileKey) {
          if (self.files.findOne({key: fileKey})) {
            //file key already used
            self.files.remove({_id: id});
            callback(new Error("File key " + fileKey + " already saved"));
            return;
          }
          // note the file key and updatedAt in the SA file record
          if (typeof api.stats === "function") {
            api.stats.call(self, fileKey, function(err, stats) {
              self.files.update({_id: id}, {$set: {key: fileKey, updatedAt: stats.mtime}}, function(err, result) {
                callback(err, result);
              });
            });
          } else {
            self.files.update({_id: id}, {$set: {key: fileKey, updatedAt: new Date}}, function(err, result) {
              callback(err, result);
            });
          }
        }
      });
    }
    //Sync
    else {
      try {
        var fileKey = api.putSync.call(self, id, preferredFilename, fsFile.getBuffer(), {overwrite: false});
        // note the file key in the SA file record
        if (fileKey) {
          if (typeof api.statsSync === "function") {
            var stats = api.statsSync.call(self, fileKey);
            if (stats) {
              self.files.update({_id: id}, {$set: {key: fileKey, updatedAt: stats.mtime}});
            }
          } else {
            self.files.update({_id: id}, {$set: {key: fileKey, updatedAt: new Date}});
          }
        }
      } catch (err) {
        // remove the SA file record
        self.files.remove({_id: id});
        throw err;
      }
    }

    return id;
  };

  self.update = function(fsFile, options, callback) {
    console.log("---SA UPDATE");
    foCheck(fsFile, "update");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};

    var id = getFileId(fsFile, options.copyName);
    var fileInfo = self.files.findOne({_id: id});

    if (!fileInfo) {
      return handleError(callback, 'Storage Adapter Update: The "' + name + '" store does not contain a file with ID ' + id);
    }

    // Put the file to storage
    if (callback) {
      api.put.call(self, id, fileInfo.key, fsFile.getBuffer(), {overwrite: true}, function(err, fileKey) {
        if (err) {
          callback(err);
        } else if (fileKey) {
          // note the updatedAt in the SA file record
          if (typeof api.stats === "function") {
            api.stats.call(self, fileKey, function(err, stats) {
              self.files.update({_id: id}, {$set: {updatedAt: stats.mtime}}, callback);
            });
          } else {
            self.files.update({_id: id}, {$set: {updatedAt: new Date}}, callback);
          }
        }
      });
    }
    //Sync
    else {
      var fileKey = api.putSync.call(self, id, fileInfo.key, fsFile.getBuffer(), {overwrite: true});
      // note the updatedAt in the SA file record
      if (fileKey) {
        if (typeof api.statsSync === "function") {
          var stats = api.statsSync.call(self, fileKey);
          if (stats) {
            self.files.update({_id: id}, {$set: {updatedAt: stats.mtime}});
          }
        } else {
          self.files.update({_id: id}, {$set: {updatedAt: new Date}});
        }
      }
    }
    return 1;
  };

  self.remove = function(fsFile, options, callback) {
    console.log("---SA REMOVE");
    foCheck(fsFile, "remove");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    options = options || {};

    var id = getFileId(fsFile, options.copyName);
    var fileInfo = self.files.findOne({_id: id});

    if (!fileInfo) {
      if (options.ignoreMissing) {
        callback && callback(null, true);
        return true;
      }
      return handleError(callback, 'Storage Adapter Remove: The "' + name + '" store does not contain a file with ID ' + id);
    }

    // Remove the file from storage
    // Async
    if (callback) {
      api.del.call(self, fileInfo.key, function(err, result) {
        if (err)
          return handleError(callback, err);

        // remove the SA file record
        self.files.remove({_id: fileInfo._id});
        callback && callback(null, true);
      });
    }
    //Sync
    else {
      api.delSync.call(self, fileInfo.key);
      // remove the SA file record
      self.files.remove({_id: fileInfo._id});
    }
  };

  self.getBuffer = function(fsFile, options, callback) {
    foCheck(fsFile, "getBuffer");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    options = options || {};

    var id = getFileId(fsFile, options.copyName);
    var fileInfo = self.files.findOne({_id: id});

    if (!fileInfo) {
      return handleError(callback, 'Storage Adapter getBuffer: The "' + name + '" store does not contain a file with ID ' + id);
    }
    if (!fileInfo.key) {
      return handleError(callback, 'Storage Adapter getBuffer: The "' + name + '" store does not contain a file with ID ' + id + ' in the "' + name + '" store is missing key');
    }

    // Async
    if (callback) {
      return api.get.call(self, fileInfo.key, callback);
    }
    // Sync
    else {
      return api.getSync.call(self, fileInfo.key);
    }
  };

  if (typeof api.getBytes === 'function') {
    self.getBytes = function(fsFile, start, end, options, callback) {
      foCheck(fsFile, "getBytes");

      if (!callback && typeof options === "function") {
        callback = options;
        options = {};
      }

      options = options || {};

      var id = getFileId(fsFile, options.copyName);
      var fileInfo = self.files.findOne({_id: id});

      if (!fileInfo) {
        return handleError(callback, 'Storage Adapter getBytes: The "' + name + '" store does not contain a file with ID ' + id);
      }
      if (!fileInfo.key) {
        return handleError(callback, 'Storage Adapter getBytes: The "' + name + '" store does not contain a file with ID ' + id + ' in the "' + name + '" store is missing key');
      }

      // Async
      if (callback) {
        return api.getBytes.call(self, fileInfo.key, start, end, callback);
      }
      // Sync
      else {
        return api.getBytesSync.call(self, fileInfo.key, start, end);
      }
    };
  }

  self.sync = function(callbacks) {
    // This is intended to be called one time in the FS.Collection constructor
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
            console.log("Update is not external; will not sync");
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