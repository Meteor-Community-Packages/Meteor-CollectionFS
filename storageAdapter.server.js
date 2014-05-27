// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################
_storageAdapters = {};

FS.StorageAdapter = function(name, options, api) {
  var self = this;

  // If name is the only argument, a string and the SA already found
  // we will just return that SA
  if (arguments.length === 1 && name === '' + name &&
          typeof _storageAdapters[name] !== 'undefined')
    return _storageAdapters[name];

  // Verify that the storage adapter defines all the necessary API methods
  if (typeof api === 'undefined') {
    throw new Error('FS.StorageAdapter please define an api');
  }
  
  FS.Utility.each('fileKey,remove,typeName,createReadStream,createWriteStream'.split(','), function(name) {
    if (typeof api[name] === 'undefined') {
      throw new Error('FS.StorageAdapter please define an api. "' + name + '" ' + (api.typeName || ''));
    }
  });

  // Create an internal namespace, starting a name with underscore is only
  // allowed for stores marked with options.internal === true
  if (options.internal !== true && name[0] === '_') {
    throw new Error('A storage adapter name may not begin with "_"');
  }

  // store reference for easy lookup by name
  if (typeof _storageAdapters[name] !== 'undefined') {
    throw new Error('Storage name already exists: "' + name + '"');
  } else {
    _storageAdapters[name] = self;
  }

  // extend self with options and other info
  FS.Utility.extend(this, options || {}, {
    name: name,
    typeName: api.typeName
  });

  // This supports optional transformWrite and transformRead
  self._transform = new FS.Transform({
    store: api,
    // Optional transformation functions:
    transformWrite: options.transformWrite,
    transformRead: options.transformRead
  });

  delete options.transformWrite;
  delete options.transformRead;

  // Create a nicer abstracted adapter interface
  self.adapter = {};

  self.adapter.fileKey = function(fileObj) {
    return api.fileKey(fileObj);
  };

  // Return readable stream
  self.adapter.createReadStream = function(fileObj, options) {
    FS.debug && console.log('createReadStream ' + self.name);
    if (self.internal) {
      // So, the internal take a fileKey
      return FS.Utility.safeStream( api.createReadStream(fileObj, options) );
    }
    return FS.Utility.safeStream( self._transform.createReadStream(fileObj, options) );

  };

  // Return writeable stream
  self.adapter.createWriteStream = function(fileObj, options) {
    FS.debug && console.log('createWriteStream ' + self.name + ', internal: ' + !!self.internal);
    var writeStream;

    if (self.internal) {
      // The internal takes a fileKey - not fileObj
      writeStream = FS.Utility.safeStream( api.createWriteStream(fileObj, options) );
    } else {
      // If we haven't set name, type, and size for this version yet, set it to same values as original version
      if (!fileObj.name({store: self.name})) {
        fileObj.name(fileObj.name(), {store: self.name});
      }
      if (!fileObj.type({store: self.name})) {
        fileObj.type(fileObj.type(), {store: self.name});
      }
      if (!fileObj.size({store: self.name})) {
        fileObj.size(fileObj.size(), {store: self.name});
      }

      writeStream = FS.Utility.safeStream( self._transform.createWriteStream(fileObj, options) );
    }

    // init debug for both internal and normal
    if (FS.debug) {
      writeStream.on('stored', function() {
        console.log('-----------STORED STREAM', name);
      });

      writeStream.on('close', function() {
        console.log('-----------CLOSE STREAM', name);
      });

      writeStream.on('end', function() {
        console.log('-----------END STREAM', name);
      });

      writeStream.on('finish', function() {
        console.log('-----------FINISH STREAM', name);
      });

      writeStream.on('error', function(error) {
        console.log('-----------ERROR STREAM', name, error && (error.message || error.code));
      });
    }

    if (!self.internal) {
      // Its really only the storage adapter who knows if the file is uploaded
      //
      // We have to use our own event making sure the storage process is completed
      // this is mainly
      writeStream.safeOn('stored', function(result) {
        if (typeof result.fileKey === 'undefined') {
          throw new Error('SA ' + name + ' type ' + api.typeName + ' did not return a fileKey');
        }
        FS.debug && console.log('SA', name, 'stored', result.fileKey);
        // Set the fileKey
        fileObj.copies[name].key = result.fileKey;

        // Update the size, as provided by the SA, in case it was changed by stream transformation
        if (typeof result.size === "number") {
          fileObj.copies[name].size = result.size;
        }

        // Set last updated time, either provided by SA or now
        fileObj.copies[name].updatedAt = result.storedAt || new Date();

        // If the file object copy havent got a createdAt then set this
        if (typeof fileObj.copies[name].createdAt === 'undefined') {
          fileObj.copies[name].createdAt = fileObj.copies[name].updatedAt;
        }

        var modifier = {};
        modifier["copies." + name] = fileObj.copies[name];
        // Update the main file object with the modifier
        fileObj.update({$set: modifier});

      });

      // Emit events from SA
      writeStream.once('stored', function(result) {
        // XXX Because of the way stores inherit from SA, this will emit on every store.
        // Maybe need to rewrite the way we inherit from SA?
        var emitted = self.emit('stored', self.name, fileObj);
        if (FS.debug && !emitted) {
          console.log(fileObj.name() + ' was successfully stored in the ' + self.name + ' store. You are seeing this informational message because you enabled debugging and you have not defined any listeners for the "stored" event on this store.');
        }
      });

      writeStream.on('error', function(error) {
        // XXX We could wrap and clarify error
        self.emit('error', self.name, error);
      });
    }

    return writeStream;
  };


  //internal
  self._removeAsync = function(fileKey, callback) {
    // Remove the file from the store
    api.remove.call(self, fileKey, callback);
  };

  /**
   * @method FS.StorageAdapter.prototype.remove
   * @public
   * @param {FS.File} fsFile The FS.File instance to be stored.
   * @param {Function} [callback] If not provided, will block and return true or false
   *
   * Attempts to remove a file from the store. Returns true if removed or not
   * found, or false if the file couldn't be removed.
   */
  self.adapter.remove = function(fileObj, callback) {
    FS.debug && console.log("---SA REMOVE");

    // Get the fileKey
    var fileKey = (fileObj instanceof FS.File)? api.fileKey(fileObj) : fileObj;

    if (callback) {
      return self._removeAsync(fileKey, FS.Utility.safeCallback(callback));
    } else {
      return Meteor._wrapAsync(self._removeAsync)(fileKey);
    }
  };

  self.remove = function(fileObj, callback) {
    // Add deprecation note
    console.warn('Storage.remove is deprecating, use "Storage.adapter.remove"');
    return self.adapter.remove(fileObj, callback);
  };

  if (typeof api.init === 'function') {
    Meteor._wrapAsync(api.init.bind(self))();
  }

};

Npm.require('util').inherits(FS.StorageAdapter, EventEmitter);