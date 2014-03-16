/** @method FS.Collection.prototype.insert Insert `File` or `FS.File` or remote URL into collection
 * @public
 * @param {File|Blob|Buffer|ArrayBuffer|Uint8Array|String} fileRef File, FS.File, or other data to insert
 * @param {function} [callback] Callback `function(error, fileObj)`
 * @returns {FS.File|undefined} The `file object`
 * [Meteor docs](http://docs.meteor.com/#insert)
 */
FS.Collection.prototype.insert = function(fileRef, callback) {
  var self = this;

  if (Meteor.isClient && !callback) {
    callback = FS.Utility.defaultCallback;
  }

  function passOrThrow(error) {
    if (callback) {
      callback(error);
    } else {
      throw error;
    }
  }

  function beginStorage(fileObj) {

    // If on client, begin uploading the data
    if (Meteor.isClient) {
      self.options.uploader && self.options.uploader(fileObj);
    }

    // If on the server, save the binary to a single chunk temp file,
    // so that it is available when FileWorker calls saveCopies.
    // This will also trigger file handling from collection observes.
    else if (Meteor.isServer) {
      fileObj.createReadStream().pipe(FS.TempStore.createWriteStream(fileObj));
    }
  }

  function checkAndInsert(fileObj) {
    // Check filters. This is called in deny functions, too, but we call here to catch
    // server inserts and to catch client inserts early, allowing us to call `onInvalid` on
    // the client and save a trip to the server.
    if (!self.allowsFile(fileObj)) {
      return passOrThrow(new Error('FS.Collection insert: file does not pass collection filters'));
    }

    // Set collection name
    fileObj.collectionName = self.name;
    // Set the chunkSize to match the current collection chunkSize
    fileObj.chunkSize = self.options.chunkSize;
    // Set counter for uploaded chunks
    fileObj.chunkCount = 0;
    // Calc the number of chunks
    fileObj.chunkSum = Math.ceil(fileObj.size / fileObj.chunkSize);

    // Insert the file into db
    // We call cloneFileRecord as an easy way of extracting the properties
    // that need saving.
    if (callback) {
      fileObj._id = self.files.insert(FS.Utility.cloneFileRecord(fileObj), function(err, id) {
        if (err) {
          if (fileObj._id) {
            delete fileObj._id;
          }
        } else {
          // Set _id, just to be safe, since this could be before or after the insert method returns
          fileObj._id = id;
          // Pass to uploader or stream data to the temp store
          beginStorage(fileObj);
        }
        callback(err, err ? void 0 : fileObj);
      });
    } else {
      fileObj._id = self.files.insert(FS.Utility.cloneFileRecord(fileObj));
      beginStorage(fileObj);
    }
    return fileObj;
  }

  // Parse, adjust fileRef
  if (fileRef instanceof FS.File) {
    return checkAndInsert(fileRef);
  } else if (typeof fileRef === "string" && (fileRef.slice(0, 5) === "http:" || fileRef.slice(0, 6) === "https:")) {
    if (callback) {
      var fileObj = new FS.File();
      fileObj.attachData(fileRef, function attachDataCallback(error) {
        if (error) {
          callback(error);
        } else {
          checkAndInsert(fileObj);
        }
      });
      return fileObj;
    } else {
      throw new Error("When passing a URL to FS.Collection.insert, you must provide a callback.");
    }
  } else {
    // For convenience, allow URL, filepath, etc. to be passed as first arg,
    // and we will attach that to a new fileobj for them
    var fileObj = new FS.File(fileRef);
    fileObj.attachData(fileRef);
    return checkAndInsert(fileObj);
  }
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

/**
 * @method FS.Collection.prototype.allowsFile Does the collection allow the specified file?
 * @public
 * @returns {boolean} True if the collection allows this file.
 *
 * Checks based on any filters defined on the collection. If the
 * file is not valid according to the filters, this method returns false
 * and also calls the filter `onInvalid` method defined for the
 * collection, passing it an English error string that explains why it
 * failed.
 */
FS.Collection.prototype.allowsFile = function fsColAllowsFile(fileObj) {
  var self = this;

  // Get filters
  var filter = self.options.filter;
  if (!filter) {
    return true;
  }
  var saveAllFileExtensions = (filter.allow.extensions.length === 0);
  var saveAllContentTypes = (filter.allow.contentTypes.length === 0);

  // Get info about the file
  var filename = fileObj.name;
  var contentType = fileObj.type;
  if (!contentType) {
    filter.onInvalid && filter.onInvalid(filename + " has an unknown content type");
    return false;
  }
  var fileSize = fileObj.size;
  if (!fileSize || isNaN(fileSize)) {
    filter.onInvalid && filter.onInvalid(filename + " has an unknown file size");
    return false;
  }

  // Do extension checks only if we have a filename
  if (filename) {
    var ext = fileObj.getExtension();
    if (!((saveAllFileExtensions ||
            _.indexOf(filter.allow.extensions, ext) !== -1) &&
            _.indexOf(filter.deny.extensions, ext) === -1)) {
      filter.onInvalid && filter.onInvalid(filename + ' has the extension "' + ext + '", which is not allowed');
      return false;
    }
  }

  // Do content type checks
  if (!((saveAllContentTypes ||
          contentTypeInList(filter.allow.contentTypes, contentType)) &&
          !contentTypeInList(filter.deny.contentTypes, contentType))) {
    filter.onInvalid && filter.onInvalid(filename + ' is of the type "' + contentType + '", which is not allowed');
    return false;
  }

  // Do max size check
  if (typeof filter.maxSize === "number" && fileSize > filter.maxSize) {
    filter.onInvalid && filter.onInvalid(filename + " is too big");
    return false;
  }
  return true;
};

/**
 * @method contentTypeInList Is the content type string in the list?
 * @private
 * @param {String[]} list - Array of content types
 * @param {String} contentType - The content type
 * @returns {Boolean}
 *
 * Returns true if the content type is in the list, or if it matches
 * one of the special types in the list, e.g., "image/*".
 */
function contentTypeInList(list, contentType) {
  var listType, found = false;
  for (var i = 0, ln = list.length; i < ln; i++) {
    listType = list[i];
    if (listType === contentType) {
      found = true;
      break;
    }
    if (listType === "image/*" && contentType.indexOf("image/") === 0) {
      found = true;
      break;
    }
    if (listType === "audio/*" && contentType.indexOf("audio/") === 0) {
      found = true;
      break;
    }
    if (listType === "video/*" && contentType.indexOf("video/") === 0) {
      found = true;
      break;
    }
  }
  return found;
}
