/** @method FS.Collection.prototype.insert Insert `file` or `FS.File` into collection
 * @public
 * @param {FS.File|File} fileRef File data reference
 * @param {function} [callback] Callback `function(error, fileObj)`
 * @returns {FS.File} The `file object`
 * [Meteor docs](http://docs.meteor.com/#insert)
 */
FS.Collection.prototype.insert = function(fileRef, callback) {
  var self = this;
  var fileObj;

  callback = callback || FS.Utility.defaultCallback;

  if (fileRef instanceof FS.File) {
    fileObj = fileRef;
  } else if (Meteor.isClient && typeof File !== "undefined" && fileRef instanceof File) {
    // For convenience, allow File to be passed directly on the client
    fileObj = new FS.File(fileRef);
  } else {
    callback(new Error('FS.Collection insert expects FS.File'));
    return;
  }

  // Set reference to this collection
  fileObj.collectionName = self.name;

  // Check filters
  if (!fileObj.fileIsAllowed()) {
    delete fileObj.collectionName;
    callback(new Error('FS.Collection insert: file does not pass collection filters'));
    return;
  }

  // Insert the file into db
  // We call cloneFileRecord as an easy way of extracting the properties
  // that need saving.
  fileObj._id = self.files.insert(FS.Utility.cloneFileRecord(fileObj), function(err, id) {
    if (err) {
      delete fileObj.collectionName;
    } else {
      fileObj._id = id;

      // If on client, begin uploading the data
      if (Meteor.isClient) {
        console.log("upload", self, fileObj);
        self.options.uploader && self.options.uploader(fileObj);
      }
      
      // If on the server, save the binary to a single chunk temp file,
      // so that it is available when FileWorker calls saveCopies.
      // This will also trigger file handling from collection observes.
      else if (Meteor.isServer) {
        FS.TempStore.ensureForFile(fileObj);
      }
    }
    callback(err, err ? void 0 : fileObj);
  });

  // We return the FS.File
  return fileObj;
};

/** @method FS.Collection.prototype.update Update the file record
 * @public
 * @param {FS.File|object} selector
 * @param {object} modifier
 * @param {object} [options]
 * @param {function} [callback]
 * [Meteor docs](http://docs.meteor.com/#update)
 */
FS.Collection.prototype.update = function(selector, modifier, options, callback) {
  var self = this;
  if (selector instanceof FS.File) {
    // Make sure the file belongs to this FS.Collection
    if (selector.collectionName === self.files._name) {
      return selector.update(modifier, options, callback);
    } else {
      // Tried to save a file in the wrong FS.Collection
      throw new Error('FS.Collection cannot update file belongs to: "' + selector.collectionName + '" not: "' + self.files._name + '"');
    }
  }

  return self.files.update(selector, modifier, options, callback);
};

/** @method FS.Collection.prototype.remove Remove the file from the collection
 * @public
 * @param {FS.File|object} selector
 * @param {Function} [callback]
 * [Meteor docs](http://docs.meteor.com/#remove)
 */
FS.Collection.prototype.remove = function(selector, callback) {
  var self = this;
  if (selector instanceof FS.File) {

    // Make sure the file belongs to this FS.Collection
    if (selector.collectionName === self.files._name) {
      return selector.remove(callback);
    } else {
      // Tried to remove a file from the wrong FS.Collection
      throw new Error('FS.Collection cannot remove file belongs to: "' + selector.collectionName + '" not: "' + self.files._name + '"');
    }
  }

  //doesn't work correctly on the client without a callback
  callback = callback || FS.Utility.defaultCallback;
  return self.files.remove(selector, callback);
};

/** @method FS.Collection.prototype.findOne
 * @public
 * @param {[selector](http://docs.meteor.com/#selectors)} selector
 * [Meteor docs](http://docs.meteor.com/#findone)
 * Example:
 ```js
 var images = new FS.Collection( ... );
 // Get the file object
 var fo = images.findOne({ _id: 'NpnskCt6ippN6CgD8' });
 ```
 */
// Call findOne on files collection
FS.Collection.prototype.findOne = function(selector) {
  var self = this;
  return self.files.findOne.apply(self.files, arguments);
};

/** @method FS.Collection.prototype.find
 * @public
 * @param {[selector](http://docs.meteor.com/#selectors)} selector
 * [Meteor docs](http://docs.meteor.com/#find)
 * Example:
 ```js
 var images = new FS.Collection( ... );
 // Get the all file objects
 var files = images.find({ _id: 'NpnskCt6ippN6CgD8' }).fetch();
 ```
 */
FS.Collection.prototype.find = function(selector) {
  var self = this;
  return self.files.find.apply(self.files, arguments);
};

/** @method FS.Collection.prototype.allow
 * @public
 * @param {object} options
 * @param {function} options.download Function that checks if the file contents may be downloaded
 * @param {function} options.insert
 * @param {function} options.update
 * @param {function} options.remove Functions that look at a proposed modification to the database and return true if it should be allowed
 * @param {[string]} [options.fetch] Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your update and remove functions
 * [Meteor docs](http://docs.meteor.com/#allow)
 * Example:
 ```js
 var images = new FS.Collection( ... );
 // Get the all file objects
 var files = images.allow({
 insert: function(userId, doc) { return true; },
 update: function(userId, doc, fields, modifier) { return true; },
 remove: function(userId, doc) { return true; },
 download: function(userId, fileObj) { return true; },
 });
 ```
 */
FS.Collection.prototype.allow = function(options) {
  var self = this;

  // Pull out the custom "download" functions
  if (options.download) {
    if (!(options.download instanceof Function)) {
      throw new Error("allow: Value for `download` must be a function");
    }
    self._validators.download.allow.push(options.download);
    delete options.download;
  }

  return self.files.allow.call(self.files, options);
};

/** @method FS.Collection.prototype.deny
 * @public
 * @param {object} options
 * @param {function} options.download Function that checks if the file contents may be downloaded
 * @param {function} options.insert
 * @param {function} options.update
 * @param {function} options.remove Functions that look at a proposed modification to the database and return true if it should be denyed
 * @param {[string]} [options.fetch] Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your update and remove functions
 * [Meteor docs](http://docs.meteor.com/#deny)
 * Example:
 ```js
 var images = new FS.Collection( ... );
 // Get the all file objects
 var files = images.deny({
 insert: function(userId, doc) { return true; },
 update: function(userId, doc, fields, modifier) { return true; },
 remove: function(userId, doc) { return true; },
 download: function(userId, fileObj) { return true; },
 });
 ```
 */
FS.Collection.prototype.deny = function(options) {
  var self = this;

  // Pull out the custom "download" functions
  if (options.download) {
    if (!(options.download instanceof Function)) {
      throw new Error("deny: Value for `download` must be a function");
    }
    self._validators.download.deny.push(options.download);
    delete options.download;
  }

  return self.files.deny.call(self.files, options);
};

// TODO: Upsert?
