// #############################################################################
//
// Access Point
//
// #############################################################################

if (Meteor.isServer) {

  var APUpload = function(fsFile, data, start) {
    var self = this;
    check(fsFile, FS.File);
    if (!EJSON.isBinary(data))
      throw new Error("APUpload expects binary data");

    fsFile.reload(); //update properties from the linked server collection

    if (typeof start === "number") {
      console.log("Received chunk of size " + data.length + " at start " + start + " for " + fsFile._id);
      // Chunked Upload
      fsFile.saveChunk(data, start, function(err, done) {
        if (err) {
          throw new Error("Unable to load binary chunk at position " + start + ": " + err.message);
        }
        if (done) {
          self.unblock();
          console.log("Received all chunks for " + fsFile._id);
          // Save file to master store and save any additional copies
          fsFile.put();
        }
      });
    } else {
      console.log("Received all data for " + fsFile._id + " in one chunk");
      self.unblock();
      // Load binary data into fsFile
      fsFile.setDataFromBinary(data);

      // Save file to master store and save any additional copies
      fsFile.put();
    }
  };

  // Returns the data for selector,
  // or data from master store if selector is not set
  var APDownload = function(fsFile, copyName, start, end) {
    this.unblock();
    return fsFile.get(copyName, start, end);
  };

  // Deletes fsFile.
  // Always deletes the entire file and all copies, even if a specific
  // selector is passed. We don't allow deleting individual copies.
  var APDelete = function(fsFile) {
    this.unblock();
    return fsFile.remove();
  };

  var APhandler = function(collection) {
    return function(data) {
      var self = this;
      var query = self.query || {};
      var id = self.params.id;
      var copyName = self.params.selector;

      // Get the fsFile
      var file = collection.findOne({_id: '' + id});

      if (!file) {
        throw new Meteor.Error(404, "Not Found", "There is no file with ID " + id);
      }

      // If http get then return file
      if (self.method.toLowerCase() === 'get') {
        try {
          var type, copyInfo;
          if (copyName) {
            copyInfo = file.copies[copyName];
            if (copyInfo) {
              type = copyInfo.type;
            }
          }
          type = type || file.type;
          if (typeof type === "string") {
            self.setContentType(type);
          }
          self.setStatusCode(200);
          return APDownload.call(self, file, copyName, query.start, query.end);
        } catch (e) {
          throw new Meteor.Error(404, "Not Found", "Could not retrieve file with ID " + id);
        }
      }

      else if (self.method.toLowerCase() === 'put') {
        return APUpload.call(self, file, data);
      }

      else if (self.method.toLowerCase() === 'del') {
        return APDelete.call(self, file);
      }
    };
  };

  var accessPointDDP = function(name) {
    var result = {};
    // We namespace with using the current Meteor convention - this could
    // change
    result[name + '/put'] = APUpload;
    result[name + '/get'] = APDownload;
    result[name + '/del'] = APDelete;
    return result;
  };

  var accessPointHTTP = function(cfs) {
    var result = {};
    // We namespace with using the current Meteor convention - this could
    // change
    result[cfs.httpUrl + '/:id'] = APhandler(cfs);
    result[cfs.httpUrl + '/:id/:selector'] = APhandler(cfs);
    return result;
  };

}

// #############################################################################
//
// COLLECTION FS
//
// #############################################################################

FS.Collection = function(name, options) {
  var self = this;

  self.options = {
    useDDP: true,
    useHTTP: false,
    filter: null, //optional
    store: null, //required
    beforeSave: null, //optional
    sync: null, //optional
    maxTries: 5, //optional
    copies: null //optional
  };

  // Extend and overwrite options
  _.extend(self.options, options);

  // When on the server we expect copies in options - otherwise we just recieve
  // the file but dont use it for anything
  if (Meteor.isServer) {
    if (!(self.options.store instanceof FS.StorageAdapter)) {
      throw new Error("You must specify a master store. Please consult the documentation.");
    }

    // #####################################################################
    //
    // Add SA observers
    // if a copy is set to sync SA changes we have to sync all other sync
    // copies SA if the change is newer than the existing and we recreate
    // the rest of the copies
    //
    // This task is added to the queue
    //
    // #####################################################################

    // Allow user to use shortcut syntax, but switch to full syntax for
    // subsequent internal use.
    if (typeof self.options.copies === "object") {
      var copyOptions;
      for (var copyName in self.options.copies) {
        copyOptions = self.options.copies[copyName];
        if (copyOptions instanceof FS.StorageAdapter) {
          self.options.copies[copyName] = {
            store: copyOptions,
            beforeSave: null,
            maxTries: self.options.maxTries
          };
        } else if (!(copyOptions.store instanceof FS.StorageAdapter)) {
          throw new Error('You must specify a store for the "' + copyName + '" copy');
        }
      }
    }
  }

  self.name = name;

  self.methodName = '/cfs/files/' + name;

  if (self.options.useDDP) {
    // Add ddp mount point + /get /put
    Meteor.isServer && Meteor.methods(accessPointDDP(self.methodName));
  }

  if (self.options.useHTTP) {
    // Add http mount point
    // Provide the upload and download server methods
    if (typeof HTTP !== 'undefined' && typeof HTTP.methods === 'function') {
      // Set httpUrl
      self.httpUrl = self.methodName;
      Meteor.isServer && HTTP.methods(accessPointHTTP(self));
    }

  }

  var collectionName = name + '.files';

  // Create the ".files" and use fsFile
  self.files = new Meteor.Collection(collectionName, {
    transform: function(doc) {
      var result = new FS.File(doc);
      result.collectionName = collectionName;
      return result;
    }
  });

  /*
   * FILTER INSERTS
   */

  // Normalize filter option values for quicker checking later
  if (self.options.filter) {
    if (!self.options.filter.allow || !Match.test(self.options.filter.allow, Object)) {
      self.options.filter.allow = {};
    }
    if (!self.options.filter.deny || !Match.test(self.options.filter.deny, Object)) {
      self.options.filter.deny = {};
    }
    if (!self.options.filter.maxSize || typeof self.options.filter.maxSize !== "number") {
      self.options.filter.maxSize = null;
    }
    if (!self.options.filter.allow.extensions || !_.isArray(self.options.filter.allow.extensions)) {
      self.options.filter.allow.extensions = [];
    }
    if (!self.options.filter.allow.contentTypes || !_.isArray(self.options.filter.allow.contentTypes)) {
      self.options.filter.allow.contentTypes = [];
    }
    if (!self.options.filter.deny.extensions || !_.isArray(self.options.filter.deny.extensions)) {
      self.options.filter.deny.extensions = [];
    }
    if (!self.options.filter.deny.contentTypes || !_.isArray(self.options.filter.deny.contentTypes)) {
      self.options.filter.deny.contentTypes = [];
    }
  }

  // This uses collection-hooks package.
  // Prevents insertion on both client and server if filter rules say so
  self.files.before.insert(function() {
    var fsFile = this.transform();
    return fsFile.fileIsAllowed();
  });

  self.files.before.update(function() {
    // TODO will need some kind of security here
    // Don't allow them to change the type, size, name, and
    // anything else that would be security or data integrity issue.
  });

  /*
   * EO FILTER INSERTS
   */

  // Save the collection reference
  _collections[collectionName] = this;

  if (Meteor.isServer) {
    // Rig an observer on the server
    var cursor = self.files.find();
    var handle = cursor.observe({
      added: function(doc) {
        console.log('added: ' + doc._id);
      },
      changed: function(newDoc, oldDoc) {
        console.log('changed: ' + oldDoc._id);
      },
      removed: function(oldDoc) {
        console.log('remove: ' + oldDoc._id);
        //delete master
        self.options.store.remove(oldDoc, {ignoreMissing: true, copyName: null});
        //delete all copies
        _.each(self.options.copies, function(copyDefinition, copyName) {
          copyDefinition.store.remove(oldDoc, {ignoreMissing: true, copyName: copyName});
        });
      }
    });

    // Tell master storage adapter how to sync
    if (self.options.sync) {
      self.options.store.sync({
        insert: function(storeId, info, buffer) {
          // Create a FS.File that already has info for the master copy
          var fsFile = new FS.File({
            name: info.name,
            type: info.type,
            size: info.size,
            utime: info.utime,
            master: {
              _id: storeId,
              name: info.name,
              type: info.type,
              size: info.size,
              utime: info.utime
            }
          });

          // Load the master buffer into the file object
          fsFile.setDataFromBuffer(buffer, info.type);

          // Save into the sync'd FS.Collection.
          self.insert(fsFile);
        },
        update: function(storeId, info) {
          // Get the FS.File
          var fsFile = self.findOne({'master._id': storeId});

          // Update info for the master store since that is the synchronized data
          // we just received. Also, set info into the generic info since we're
          // treating this like an upload. Finally, clear out other copy info
          // so that the file worker will create new copies.
          fsFile.update({$set: {
              name: info.name,
              type: info.type,
              size: info.size,
              utime: info.utime,
              'master.name': info.name,
              'master.type': info.type,
              'master.size': info.size,
              'master.utime': info.utime
            }, $unset: {copies: ''}});
        },
        remove: function(storeId) {
          //TODO possibly should just remove this copy?
          self.remove({'master._id': storeId});
        }
      });
    }
  }

};

if (Meteor.isServer) {

  function loadBuffer(fsFile, callback) {
    var fsFileClone = fsFile.clone();

    function copyData() {
      fsFileClone.setDataFromBinary(fsFile.getBinary());
      callback(null, fsFileClone);
    }

    if (fsFile.hasData()) {
      return copyData();
    }

    // If the supplied fsFile does not have a buffer loaded already,
    // try to load it from the temporary file.
    console.log("attempting to load buffer from temp file");
    fsFile.setDataFromTempFile(function(err) {
      if (err) {
        callback(err);
      } else {
        copyData();
      }
    });
  }

  var loadBufferSync = Meteor._wrapAsync(loadBuffer);

  function saveCopy(fsFile, store, beforeSave) {
    // Get a new copy and a fresh buffer each time in case beforeSave changes anything
    var fsFileClone = loadBufferSync(fsFile);

    // Call the beforeSave function provided by the user
    if (!beforeSave ||
            beforeSave.apply(fsFileClone) !== false) {
      var id = store.insert(fsFileClone);
      if (!id) {
        return null;
      } else {
        return {
          _id: id,
          name: fsFileClone.name,
          type: fsFileClone.type,
          size: fsFileClone.size,
          utime: fsFileClone.utime
        };
      }
    } else if (beforeSave) {
      //beforeSave returned false
      return false;
    }
  }

  // This function is called to save the master copy. It may be safely
  // called multiple times with the "missing" option set. It is synchronous.
  FS.Collection.prototype.saveMaster = function(fsFile, options) {
    var self = this;
    options = options || {};

    var copyInfo = fsFile.master;

    // If master has not already been saved or we want to overwrite it
    if (!options.missing || (copyInfo === void 0 && !fsFile.failedPermanently())) {
      console.log('creating master copy');

      var result = saveCopy(fsFile, self.options.store, self.options.beforeSave);
      if (result === false) {
        // The master beforeSave returned false; delete the whole record.
        fsFile.remove();
      } else if (result === null) {
        // Temporary failure; let the fsFile log it and potentially decide
        // to give up.
        fsFile.logCopyFailure();
      } else {
        // Success. Update the file object
        fsFile.update({$set: {master: result}}, function(err, result) {
          if (err) {
            console.log(err);
          }
          fsFile.deleteTempFiles(function(err) {
            if (err) {
              console.log(err);
            }
          });
        });
      }
    }
  };

  // This function is called to create all copies or only missing copies. It may be safely
  // called multiple times with the "missing" option set. It is synchronous.
  FS.Collection.prototype.saveCopies = function(fsFile, options) {
    var self = this;
    options = options || {};

    // If the supplied fsFile does not have a buffer loaded already,
    // load it from the master store.
    if (!fsFile.hasData()) {
      fsFile.setDataFromBinary(fsFile.get());
    }

    // Loop through copies defined in CFS options
    _.each(self.options.copies, function(copyDefinition, copyName) {
      var copyInfo = fsFile.copies && fsFile.copies[copyName];
      // If copy has not already been saved or we want to overwrite it
      if (!options.missing || (copyInfo === void 0 && !fsFile.failedPermanently(copyName))) {
        console.log('creating copy ' + copyName);

        var result = saveCopy(fsFile, copyDefinition.store, copyDefinition.beforeSave);
        if (result === null) {
          // Temporary failure; let the fsFile log it and potentially decide
          // to give up.
          fsFile.logCopyFailure(copyName);
        } else {
          // Update the main file object
          // copyInfo might be false, which indicates that this copy
          // should never be created in the future.
          var modifier = {};
          modifier["copies." + copyName] = result;
          // Update the main file object with the modifier
          fsFile.update({$set: modifier});
        }
      }
    });
  };

  FS.Collection.prototype.getStoreForCopy = function(copyName) {
    var self = this;
    if (copyName) {
      if (typeof self.options.copies[copyName] !== "object" || self.options.copies[copyName] === null) {
        throw new Error('getStoreForCopy: copy "' + copyName + '" is not defined');
      }
      return self.options.copies[copyName].store;
    } else {
      return self.options.store;
    }
  };

}

// Collection Wrappers
// Call insert on files collection
FS.Collection.prototype.insert = function(doc, callback) {
  console.log('FS.Collection insert-------------');
  var self = this;
  var fileObj;

  var doInsert = function() {
    // Set reference to this collection
    fileObj.collectionName = self.files._name;

    // Insert the file into db
    console.log('Now doing actual insert into collection');
    fileObj._id = self.files.insert(cloneFileRecord(fileObj), function(err, id) {
      console.log('Insert callback error:', err);
      console.log('Insert callback result:', id);
      if (err) {
        if (typeof callback === 'function') {
          callback(err, id);
        } else {
          throw err;
        }
      } else {
        fileObj.put(callback);
      }
    });
  };

  if (doc instanceof FS.File) {
    fileObj = doc;
    doInsert();
  } else if (Meteor.isClient && typeof File !== "undefined" && doc instanceof File) {
    // For convenience, allow File to be passed directly on the client
    FS.File.fromFile(doc, function(err, f) {
      if (err) {
        callback(err);
      } else {
        fileObj = f;
        doInsert();
      }
    });
  } else {
    var e = new Error('FS.Collection insert expects FS.File');
    if (typeof callback === 'function') {
      callback(e);
    } else {
      throw e;
    }
  }

  // We return the FS.File
  return doc;
};

// Call update on files collection
FS.Collection.prototype.update = function(selector, modifier, options) {
  var self = this;
  if (selector instanceof FS.File) {
    // We use the FS.File handle and makes sure the file belongs to this
    // FS.Collection
    if (selector.collectionName === self.files._name) {
      selector.update(modifier, options);
    } else {
      // User tried to save a file in the wrong FS.Collection
      throw new Error('FS.Collection cannot update file belongs to: "' + selector.collectionName + '" not: "' + self.files._name + '"');
    }
    return self.files.update(selector, modifier, options);
  } else {
    throw new Error('FS.Collection update expects a FS.File');
  }
};

// Call remove on files collection
FS.Collection.prototype.remove = function(selector, callback) {
  var self = this;
  if (selector instanceof FS.File) {
    selector.remove();
  } else {
    //doesn't work correctly on the client without a callback
    callback = callback || defaultCallback;
    return self.files.remove(selector, callback);
  }
};

// Call findOne on files collection
FS.Collection.prototype.findOne = function(selector) {
  var self = this;
  return self.files.findOne.apply(self.files, arguments);
};

// Call find on files collection
FS.Collection.prototype.find = function(selector) {
  var self = this;
  return self.files.find.apply(self.files, arguments);
};

FS.Collection.prototype.allow = function() {
  var self = this;
  return self.files.allow.apply(self.files, arguments);
};

FS.Collection.prototype.deny = function() {
  var self = this;
  return self.files.deny.apply(self.files, arguments);
};

// TODO: Upsert?

if (Meteor.isClient) {
  FS.Collection.prototype.acceptDropsOn = function(templateName, selector, metadata, callback) {
    var self = this, events = {}, metadata = metadata || {};

    callback = callback || defaultCallback;

    // Prevent default drag and drop
    function noopHandler(evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }

    // Handle file dropped
    function dropped(evt, temp) {
      noopHandler(evt);
      var files = evt.dataTransfer.files, fileObj;
      // Check if the metadata is a getter / function
      if (typeof metadata === 'function') {
        try {
          metadata = metadata.apply(this, [evt, temp]) || {};
        } catch (err) {
          callback(new Error('acceptDropsOn error in metadata getter, Error: ' + (err.stack || err.message)));
        }
      }

      if (typeof metadata !== "object") {
        callback(new Error("metadata must be an object"));
      }

      for (var i = 0, ln = files.length; i < ln; i++) {
        FS.File.fromFile(files[i], function(err, fsFile) {
          if (err) {
            callback(err);
          } else {
            fsFile.metadata = myMetadata;
            self.insert(fsFile, callback);
          }
        });
      }
    }

    events['dragenter ' + selector] = noopHandler;
    events['dragexit ' + selector] = noopHandler;
    events['dragover ' + selector] = noopHandler;
    events['dragend ' + selector] = noopHandler;
    events['drop ' + selector] = dropped;

    Template[templateName].events(events);
  };
}