// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################

var _storageAdapters = {};

StorageAdapter = function(name, options, api) {
  var self = this;

  // Check the api
  if (typeof api === 'undefined') {
    throw new Error('StorageAdapter please define an api');
  }

  if (typeof api.get !== 'function') {
    throw new Error('StorageAdapter please define an api.get function');
  }

  if (typeof api.put !== 'function') {
    throw new Error('StorageAdapter please define an api.put function');
  }

  if (typeof api.del !== 'function') {
    throw new Error('StorageAdapter please define an api.del function');
  }

  if (api.typeName !== '' + api.typeName) {
    throw new Error('StorageAdapter please define an api.typeName string');
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

  var foCheck = function(fileObject, type) {
    if (!(fileObject instanceof FileObject)) {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fileObject');
    }
    if (typeof fileObject._id !== 'string') {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fileObject with an id');
    }
    if (typeof fileObject.collectionName !== 'string') {
      throw new Error('Storage adapter "' + name + '" ' + type + ' requires fileObject in a CollectionFS');
    }
  };

  var getFileInfo = function(fileObject) {
    // TODO: if the same SA instance is used for two different copies, checking
    // for cfs and cfsId will not be enough; will need to key on copyName, too.
    // Should we not allow using the same one for different copies?
    return self.files.findOne({cfs: fileObject.collectionName, cfsId: fileObject._id});
  };

  self.insert = function(fileObject, options, callback) {
    console.log("---SA INSERT");
    var self = this;
    foCheck(fileObject, "insert");
    if (typeof fileObject.buffer === 'undefined') {
      throw new Error('Storage adapter "' + name + '" insert requires fileObject with buffer data');
    }

    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    // Check if file somehow is already found in storage adapter
    if (getFileInfo(fileObject)) {
      throw new Error('File "' + fileObject.name + '" already exists in storage adapter "' + name + '"');
    }

    // insert the file ref into the SA file record
    var id = self.files.insert({cfs: fileObject.collectionName, cfsId: fileObject._id, createdAt: new Date()});

    // construct the filename
    var preferredFilename = fileObject.name;

    // Put the file to storage
    // Async
    if (callback) {
      api.put.call(self, id, preferredFilename, fileObject.buffer, {overwrite: false}, function(err, fileKey, updatedAt) {
        if (err) {
          // remove the SA file record
          self.files.remove({_id: id});
          callback(err);
        } else if (fileKey) {
          if (self.files.findOne({key: fileKey})) {
            //file key already used
            self.files.remove({_id: id});
            callback(new Error("File key " + fileKey + " already saved"));
          }
          // note the file key and updatedAt in the SA file record
          if (typeof api.stats === "function") {
            api.stats.call(self, fileKey, function(err, stats) {
              console.log("Modified time", stats.mtime);
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
        var fileKey = api.putSync.call(self, id, preferredFilename, fileObject.buffer, {overwrite: false});
        // note the file key in the SA file record
        if (fileKey) {
          if (typeof api.statsSync === "function") {
            var stats = api.statsSync.call(self, fileKey);
            if (stats) {
              console.log("Modified time", stats.mtime);
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

  self.update = function(fileObject, options, callback) {
    //TODO test this
    console.log("---SA UPDATE");
    var self = this;
    foCheck(fileObject, "update");

    var fileInfo = getFileInfo(fileObject);

    if (!fileInfo) {
      throw new Error('Storage adapter "' + name + '" update does not contain the file');
    }

    var id = fileInfo._id;

    // Put the file to storage
    if (callback) {
      api.put.call(self, id, fileInfo.key, fileObject.buffer, {overwrite: true}, function(err, fileKey) {
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
      var fileKey = api.putSync.call(self, id, fileInfo.key, fileObject.buffer, {overwrite: true});
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

  self.remove = function(fileObject, options, callback) {
    console.log("---SA REMOVE");
    var self = this;
    foCheck(fileObject, "remove");

    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    options = options || {};

    var fileInfo = getFileInfo(fileObject);
    if (!fileInfo) {
      if (options.ignoreMissing) {
        callback && callback(null, true);
        return true;
      }
      return handleError(callback, 'Storage adapter "' + name + '" remove does not contain the file');
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

  self.getBuffer = function(fileObject, callback) {
    var self = this;
    foCheck(fileObject, "getBuffer");

    var fileInfo = getFileInfo(fileObject);

    if (!fileInfo) {
      throw new Error('Storage adapter "' + name + '" getBuffer has not stored fileObject')
    }

    if (!fileInfo.key) {
      throw new Error('Storage adapter "' + name + '" getBuffer is missing key for fileObject')
    }

    // Async
    if (callback) {
      console.log("getBuffer async");
      return api.get.call(self, fileInfo.key, callback);
    }
    // Sync
    else {
      console.log("getBuffer sync", fileInfo.key);
      return api.getSync.call(self, fileInfo.key);
    }
  };

  if (typeof api.getBytes === 'function') {
    self.getBytes = function(fileObject, start, end, callback) {
      var self = this;
      foCheck(fileObject, "getBytes");

      var fileInfo = getFileInfo(fileObject);

      if (!fileInfo) {
        throw new Error('Storage adapter "' + name + '" getBytes has not stored fileObject')
      }

      // Async
      if (callback) {
        console.log("getBytes async");
        return api.getBytes.call(self, fileInfo.key, start, end, callback);
      }
      // Sync
      else {
        console.log("getBytes sync");
        return api.getBytesSync.call(self, fileInfo.key, start, end);
      }
    };
  }

  self.sync = function(collectionFS) {
    // This is intended to be called one time in the CollectionFS constructor
    
    // TODO this is currently not usable; need to filter out changes that we make
    return; // remove this when fixed

    api.watch && api.watch.call(self, function(type, fileKey, info) {
      var fileInfo = self.files.findOne({key: fileKey});
      if (fileInfo) {
        if (type === "remove") {
          collectionFS.remove({_id: fileInfo.cfsId});
        } else { //changed
          // Compare the updated date of the watched file against the one
          // recorded in our files collection. If they match, then we changed
          // this file, so we don't need to do anything. If they don't match,
          // then this is an outside change that we need to sync.
          // TODO does not work because watcher usually sees file before
          // fileInfo.updateAt is set?
          console.log(fileInfo, info);
          if (fileInfo.updatedAt && fileInfo.updatedAt.getTime() === info.utime.getTime()) {
            console.log("Update is not external; will not sync");
            return;
          }
          self.files.update({_id: fileInfo._id}, {$set: {updatedAt: info.utime}});
          var fileObject = makeFileObject(fileInfo._id, info);
          self.getBuffer(fileObject, function(buffer) {
            fileObject.loadBuffer(buffer, info.type);
            collectionFS.update(fileObject);
          });
        }
      } else {
        api.get.call(self, fileKey, function(err, buffer) {
          if (buffer) {
            // Insert information about this file into the storage adapter collection
            var filesId = self.files.insert({key: fileKey, createdAt: new Date()});
            
            // Create a FileObject that already has info for the master copy
            var fileObject = makeFileObject(filesId, info);
            
            // Load the master buffer into the file object
            fileObject.loadBuffer(buffer, info.type);
            
            // Save into the sync'd CollectionFS. This will cause additional
            // copies to be created, but the master copy will not be saved
            // because we already have the info for it.
            collectionFS.insert(fileObject, function(err, id) {
              if (id) {
                self.files.update({_id: filesId}, {$set: {cfs: fileObject.collectionName, cfsId: id}});
              }
            });
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

  // // Sync; should be called once by sync'd CFS to pass itself for updating whenever files change externally
  // api.sync = function(collectionFS) {};

};

var makeFileObject = function(filesId, info) {
  return new FileObject({
    name: info.name,
    type: info.type,
    size: info.size,
    utime: info.utime,
    master: {
      _id: filesId,
      name: info.name,
      type: info.type,
      size: info.size,
      utime: info.utime
    }
  });
};