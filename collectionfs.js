// #############################################################################
//
// Access Point
//
// #############################################################################

if (Meteor.isServer) {

  var APUpload = function(fileObject, data, start) {
    check(fileObject, FileObject);
    if (!EJSON.isBinary(data))
      throw new Error("APUpload expects binary data");

    this.unblock();

    fileObject.reload(); //update properties from the linked server collection

    if (typeof start === "number") {
      console.log("APUpload got chunk of size " + data.length + " at start " + start);
      // Chunked Upload
      fileObject.loadBinaryChunk(data, start, function(err, done) {
        if (err) {
          throw new Error("APUpload problem loading binary chunk at position " + start + ": " + err.message);
        }
        if (done) {
          console.log("Received all chunks for " + fileObject._id);
          // Save file to master store and save any additional copies
          console.log("Buffer length: " + fileObject.buffer.length);
          fileObject.put();
        }
      });
    } else {
      console.log("APUpload get all data in one chunk");
      // Load binary data into fileObject, which also sets fileObject.buffer
      fileObject.loadBinary(data);

      // Save file to master store and save any additional copies
      fileObject.put();

      // TODO if any copies missing and not set to false, add this to copymaker queue
      // to try again later
    }
  };

  // Returns the data for selector,
  // or data from master store if selector is not set
  var APDownload = function(fileObject, selector, start, end) {
    this.unblock();
    return fileObject.get(selector, start, end);
  };

  // Deletes fileObject.
  // Always deletes the entire file and all copies, even if a specific
  // selector is passed. We don't allow deleting individual copies.
  var APDelete = function(fileObject) {
    this.unblock();
    return fileObject.remove();
  };

  var APhandler = function(collection) {
    return function(data) {
      var self = this;
      var query = self.query || {};

      // Get the fileObject
      var file = collection.findOne({_id: '' + self.params.id});

      if (!file) {
        throw new Meteor.Error(404, "Not Found", "There is no file with ID " + self.params.id);
      }

      // If http get then return file
      if (self.method.toLowerCase() === 'get') {
        try {
          self.setContentType(file.type);
          self.setStatusCode(200);
          return APDownload.call(self, file, self.params.selector, query.start, query.end);
        } catch (e) {
          throw new Meteor.Error(404, "Not Found", "Could not retrieve file with ID " + self.params.id);
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

CollectionFS = function(name, options) {
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
    if (!(self.options.store instanceof StorageAdapter)) {
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
        if (copyOptions instanceof StorageAdapter) {
          self.options.copies[copyName] = {
            store: copyOptions,
            beforeSave: null,
            maxTries: self.options.maxTries
          };
        } else if (!(copyOptions.store instanceof StorageAdapter)) {
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

  // Create the ".files" and use fileObject
  self.files = new Meteor.Collection(collectionName, {
    transform: function(doc) {
      var result = new FileObject(doc);
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
    var fileObject = this.transform();
    return fileObject.fileIsAllowed();
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
  _collectionsFS[collectionName] = this;


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
        self.options.store.remove(oldDoc, {ignoreMissing: true});
        //delete all copies
        _.each(self.options.copies, function(copyDefinition, copyName) {
          copyDefinition.store.remove(oldDoc, {ignoreMissing: true});
        });
      }
    });

    // Tell master storage adapter what to sync to
    if (self.options.sync) {
      self.options.store.sync(self);
    }
  }

};

if (Meteor.isServer) {

  function saveCopy(fileObject, store, beforeSave) {
    // Get a new copy and a fresh buffer each time in case beforeSave changes anything
    var copyOfFileObject = fileObject.clone();
    copyOfFileObject.loadBuffer(fileObject.buffer);

    // Call the beforeSave function provided by the user
    if (!beforeSave ||
            beforeSave.apply(copyOfFileObject) !== false) {
      var id = store.insert(copyOfFileObject);
      if (!id) {
        return null;
      } else {
        return {
          _id: id,
          name: copyOfFileObject.name,
          type: copyOfFileObject.type,
          size: copyOfFileObject.size,
          utime: copyOfFileObject.utime
        };
      }
    } else if (beforeSave) {
      //beforeSave returned false
      return false;
    }
  }

  // This function is called to save the master copy. It may be safely
  // called multiple times with the "missing" option set. It is synchronous.
  CollectionFS.prototype.saveMaster = function(fileObject, options) {
    var self = this;
    options = options || {};

    var copyInfo = fileObject.master;
    console.log("saveMaster copyInfo", copyInfo);

    // If the supplied fileObject does not have a buffer loaded already,
    // load it from the temporary file.
    if (!(fileObject.buffer instanceof Buffer)) {
      console.log("saveMaster attempting to load buffer from temp file");
      if (fileObject.tempFile) {
        fileObject.loadBufferFromTempFile();
      } else {
        throw new Error("saveMaster: Cannot save without buffer in FileObject");
      }
    }
    
    console.log("saveMaster missing:", options.missing);
    console.log("saveMaster failed perm:", fileObject.failedPermanently());

    // If master has not already been saved or we want to overwrite it
    if (!options.missing || (copyInfo === void 0 && !fileObject.failedPermanently())) {
      console.log('create master copy');

      var result = saveCopy(fileObject, self.options.store, self.options.beforeSave);
      if (result === false) {
        // The master beforeSave returned false; delete the whole record.
        fileObject.remove();
      } else if (result === null) {
        // Temporary failure; let the fileObject log it and potentially decide
        // to give up.
        fileObject.logCopyFailure();
      } else {
        // Success. Update the file object
        fileObject.update({$set: {master: result}});
      }
    }
  };

  // This function is called to create all copies or only missing copies. It may be safely
  // called multiple times with the "missing" option set. It is synchronous.
  CollectionFS.prototype.saveCopies = function(fileObject, options) {
    var self = this;
    options = options || {};

    // If the supplied fileObject does not have a buffer loaded already,
    // load it from the master store.
    if (!(fileObject.buffer instanceof Buffer)) {
      fileObject.loadBinary(fileObject.get());
    }

    // Loop through copies defined in CFS options
    _.each(self.options.copies, function(copyDefinition, copyName) {
      var copyInfo = fileObject.copies && fileObject.copies[copyName];
      // If copy has not already been saved or we want to overwrite it
      if (!options.missing || (copyInfo === void 0 && !fileObject.failedPermanently(copyName))) {
        console.log('create copy ' + copyName);

        var result = saveCopy(fileObject, copyDefinition.store, copyDefinition.beforeSave);
        if (result === null) {
          // Temporary failure; let the fileObject log it and potentially decide
          // to give up.
          fileObject.logCopyFailure(copyName);
        } else {
          // Update the main file object
          // copyInfo might be false, which indicates that this copy
          // should never be created in the future.
          var modifier = {};
          modifier["copies." + copyName] = result;
          // Update the main file object with the modifier
          fileObject.update({$set: modifier});
        }
      }
    });
  };

  CollectionFS.prototype.getStorageAdapter = function(selector) {
    var self = this;
    if (selector) {
      if (typeof self.options.copies[selector] !== "object" || self.options.copies[selector] === null) {
        throw new Error('getStorageAdapter: selector "' + selector + '" is not defined');
      }
      return self.options.copies[selector].store;
    } else {
      return self.options.store;
    }
  };

}

// Collection Wrappers
// Call insert on files collection
CollectionFS.prototype.insert = function(doc, callback) {
  console.log('CollectionFS insert-------------');
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

  if (doc instanceof FileObject) {
    fileObj = doc;
    doInsert();
  } else if (Meteor.isClient && typeof File !== "undefined" && doc instanceof File) {
    // For convenience, allow File to be passed directly on the client
    fileObj = new FileObject(doc);
    doInsert();
  } else {
    throw new Error('CollectionFS insert expects FileObject');
  }

  // We return the FileObject
  return doc;
};

// Call update on files collection
CollectionFS.prototype.update = function(selector, modifier, options) {
  var self = this;
  if (selector instanceof FileObject) {
    // We use the FileObject handle and makes sure the file belongs to this
    // collectionFS
    if (selector.collectionName === self.files._name) {
      selector.update(modifier, options);
    } else {
      // User tried to save a file in the wrong collectionFS
      throw new Error('CollectionFS cannot update file belongs to: "' + selector.collectionName + '" not: "' + self.files._name + '"');
    }
    return self.files.update(selector, modifier, options);
  } else {
    throw new Error('CollectionFS update expects a FileObject');
  }
};

// Call remove on files collection
CollectionFS.prototype.remove = function(selector, callback) {
  var self = this;
  if (selector instanceof FileObject) {
    selector.remove();
  } else {
    //doesn't work correctly on the client without a callback
    callback = callback || defaultCallback;
    return self.files.remove(selector, callback);
  }
};

// Call findOne on files collection
CollectionFS.prototype.findOne = function(selector) {
  var self = this;
  return self.files.findOne.apply(self.files, arguments);
};

// Call find on files collection
CollectionFS.prototype.find = function(selector) {
  var self = this;
  return self.files.find.apply(self.files, arguments);
};

CollectionFS.prototype.allow = function() {
  var self = this;
  return self.files.allow.apply(self.files, arguments);
};

CollectionFS.prototype.deny = function() {
  var self = this;
  return self.files.deny.apply(self.files, arguments);
};

// TODO: Upsert?

if (Meteor.isClient) {
  // There is a single uploads transfer queue per client (not per CFS)
  CollectionFS.downloadQueue = new TransferQueue();
  
  // There is a single downloads transfer queue per client (not per CFS)
  CollectionFS.uploadQueue = new TransferQueue(true);
}