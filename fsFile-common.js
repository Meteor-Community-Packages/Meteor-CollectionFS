/**
 * @method FS.File
 * @namespace FS.File
 * @public
 * @constructor
 * @param {object|File|Blob} ref File reference
 * @todo Should we refactor the file record into `self.record`?
 */
FS.File = function(ref, createdByTransform) {
  var self = this;

  self.createdByTransform = !!createdByTransform;

  if ((typeof File !== "undefined" && ref instanceof File) ||
    (typeof Blob !== "undefined" && ref instanceof Blob)){
    self.attachData(ref);
  } else {
    if (typeof ref !== 'object') {
      ref = {};
    }

    // Extend self with filerecord related data
    FS.Utility.extend(self, FS.Utility.cloneFileRecord(ref));
  }
};

/**
 * @method FS.File.prototype.attachData
 * @public
 * @param {File|Blob|Buffer|ArrayBuffer|Uint8Array|String} data The data that you want to attach to the file.
 * @param {Object} [options] Options
 * @param {String} [options.type] The data content (MIME) type, if known.
 * @param {Function} [callback] Callback function, callback(error). On the client, a callback is required if data is a URL.
 * @returns {FS.File} This FS.File instance.
 */
FS.File.prototype.attachData = function fsFileAttachData(data, options, callback) {
  var self = this;

  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }
  options = options || {};

  if (Meteor.isClient && !callback) {
    callback = FS.Utility.defaultCallback;
  }

  // Set any other properties we can determine from the source data
  // File
  if (typeof File !== "undefined" && data instanceof File) {
    self.name = data.name;
    self.updatedAt = data.lastModifiedDate;
    self.size = data.size;
    setData(data.type);
  }
  // Blob
  else if (typeof Blob !== "undefined" && data instanceof Blob) {
    self.updatedAt = new Date;
    self.size = data.size;
    setData(data.type);
  }
  // URL: we need to do a HEAD request to get the type because type
  // is required for filtering to work.
  else if (typeof data === "string" && (data.slice(0, 5) === "http:" || data.slice(0, 6) === "https:")) {
    if (!callback) {
      var result = Meteor.call('_cfs_getUrlInfo', data);
      FS.Utility.extend(self, result);
      setData(self.type);
    } else {
      Meteor.call('_cfs_getUrlInfo', data, function (error, result) {
        FS.debug && console.log("URL HEAD RESULT:", result);
        if (error) {
          callback(error);
        } else {
          FS.Utility.extend(self, result);
          setData(self.type);
        }
      });
    }
  }
  // Everything else
  else {
    setData(options.type);
  }

  // Set the data
  function setData(type) {
    self.data = new DataMan(data, type);

    // Update the type to match what the data is
    self.type = self.data.type();

    // Update the size to match what the data is
    if (!self.size) {
      if (callback) {
        self.data.size(function (error, size) {
          if (error) {
            callback && callback();
          } else {
            self.size = size;
            setName();
          }
        });
      } else {
        self.size = self.data.size();
      }
    } else {
      setName();
    }
  }

  function setName() {
    // See if we can extract a file name from URL or filepath
    if (!self.name && typeof data === "string" && data.slice(0, 5) !== "data:") {
      var dataWithoutQueryString = data.split('?')[0]; //should have no effect on filepath
      if (FS.Utility.getFileExtension(dataWithoutQueryString).length) {
        self.name = dataWithoutQueryString.slice(dataWithoutQueryString.lastIndexOf('/') + 1);
      }
    }

    callback && callback();
  }

  return self; //allow chaining
};

/**
 * @method FS.File.prototype.uploadProgress
 * @public
 * @returns {number} The server confirmed upload progress
 */
FS.File.prototype.uploadProgress = function() {
  var self = this;
  // Make sure our file record is updated
  self.getFileRecord();

  // Return the confirmed progress
  return Math.round((self.chunkCount || 0) / (self.chunkSum || 1) * 100);
};

/**
 * @method FS.File.prototype.controlledByDeps
 * @public
 * @returns {FS.Collection} Returns true if this FS.File is reactive
 *
 * > Note: Returns true if this FS.File object was created by a FS.Collection
 * > and we are in a reactive computations. What does this mean? Well it should
 * > mean that our fileRecord is fully updated by Meteor and we are mounted on
 * > a collection
 */
FS.File.prototype.controlledByDeps = function() {
  var self = this;
  return self.createdByTransform && Deps.active;
};

/**
 * @method FS.File.prototype.getCollection
 * @public
 * @returns {FS.Collection} Returns attached collection or undefined if not mounted
 */
FS.File.prototype.getCollection = function() {
  // Get the collection reference
  var self = this;

  // If we already made the link then do no more
  if (self.collection) {
    return self.collection;
  }

  // If we don't have a collectionName then there's not much to do, the file is
  // not mounted yet
  if (!self.collectionName) {
    // Should not throw an error here - could be common that the file is not
    // yet mounted into a collection
    return;
  }

  // Link the collection to the file
  self.collection = FS._collections[self.collectionName];

  return self.collection; //possibly undefined, but that's desired behavior
};

/**
 * @method FS.File.prototype.isMounted
 * @public
 * @returns {FS.Collection} Returns attached collection or undefined if not mounted
 */
FS.File.prototype.isMounted = FS.File.prototype.getCollection;

/**
 * @method FS.File.prototype.getFileRecord Returns the fileRecord
 * @public
 * @returns {object} The filerecord
 */
FS.File.prototype.getFileRecord = function() {
  var self = this;
  // Check if this file object fileRecord is kept updated by Meteor, if so
  // return self
  if (self.controlledByDeps()) {
    return self;
  }
  // Go for manually updating the file record
  if (self.isMounted()) {
    FS.debug && console.log('GET FILERECORD: ' + self._id);

    // Return the fileRecord or an empty object
    var fileRecord = self.collection.files.findOne({_id: self._id}) || {};
    FS.Utility.extend(self, fileRecord);
    return fileRecord;
  } else {
    // We return an empty object, this way users can still do `getRecord().size`
    // Without getting an error
    return {};
  }
};

/**
 * @method FS.File.prototype.update
 * @public
 * @param {modifier} modifier
 * @param {object} [options]
 * @param {function} [callback]
 *
 * Updates the fileRecord.
 */
FS.File.prototype.update = function(modifier, options, callback) {
  var self = this;

  FS.debug && console.log('UPDATE: ' + JSON.stringify(modifier));

  // Make sure we have options and callback
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }
  callback = callback || FS.Utility.defaultCallback;

  if (!self.isMounted()) {
    callback(new Error("Cannot update a file that is not associated with a collection"));
    return;
  }

  // Call collection update - File record
  return self.collection.files.update({_id: self._id}, modifier, options, function(err, count) {
    // Update the fileRecord if it was changed and on the client
    // The server-side methods will pull the fileRecord if needed
    if (count > 0 && Meteor.isClient)
      self.getFileRecord();
    // Call callback
    callback(err, count);
  });
};

/**
 * Remove the current file from its FS.Collection
 *
 * @method FS.File.prototype.remove
 * @public
 * @param {Function} [callback]
 * @returns {number} Count
 */
FS.File.prototype.remove = function(callback) {
  var self = this;

  FS.debug && console.log('REMOVE: ' + self._id);

  callback = callback || FS.Utility.defaultCallback;

  if (!self.isMounted()) {
    callback(new Error("Cannot remove a file that is not associated with a collection"));
    return;
  }

  return self.collection.files.remove({_id: self._id}, function(err, res) {
    if (!err) {
      delete self._id;
      delete self.collection;
      delete self.collectionName;
    }
    callback(err, res);
  });
};

/**
 * @method FS.File.prototype.moveTo
 * @param {FS.Collection} targetCollection
 * @private // Marked private until implemented
 * @todo Needs to be implemented
 *
 * Move the file from current collection to another collection
 *
 * > Note: Not yet implemented
 */

/**
 * @method FS.File.prototype.getExtension Returns the lowercase file extension
 * @public
 * @returns {string} The extension eg.: `jpg` or if not found then an empty string ''
 */
FS.File.prototype.getExtension = function() {
  var self = this;
  // Make sure our file record is updated
  self.getFileRecord();
  return FS.Utility.getFileExtension(self.name);
};

function checkContentType(fsFile, storeName, startOfType) {
  var type;
  if (storeName && fsFile.hasCopy(storeName)) {
    type = fsFile.copies[storeName].type;
  } else {
    type = fsFile.type;
  }
  if (typeof type === "string") {
    return type.indexOf(startOfType) === 0;
  }
  return false;
}

/**
 * @method FS.File.prototype.isImage Is it an image file?
 * @public
 * @param {object} [options]
 * @param {string} [options.store] The store we're interested in
 *
 * Returns true if the copy of this file in the specified store has an image
 * content type. If the file object is unmounted or doesn't have a copy for
 * the specified store, or if you don't specify a store, this method checks
 * the content type of the original file.
 */
FS.File.prototype.isImage = function(options) {
  return checkContentType(this, (options || {}).store, 'image/');
};

/**
 * @method FS.File.prototype.isVideo Is it a video file?
 * @public
 * @param {object} [options]
 * @param {string} [options.store] The store we're interested in
 *
 * Returns true if the copy of this file in the specified store has a video
 * content type. If the file object is unmounted or doesn't have a copy for
 * the specified store, or if you don't specify a store, this method checks
 * the content type of the original file.
 */
FS.File.prototype.isVideo = function(options) {
  return checkContentType(this, (options || {}).store, 'video/');
};

/**
 * @method FS.File.prototype.isAudio Is it an audio file?
 * @public
 * @param {object} [options]
 * @param {string} [options.store] The store we're interested in
 *
 * Returns true if the copy of this file in the specified store has an audio
 * content type. If the file object is unmounted or doesn't have a copy for
 * the specified store, or if you don't specify a store, this method checks
 * the content type of the original file.
 */
FS.File.prototype.isAudio = function(options) {
  return checkContentType(this, (options || {}).store, 'audio/');
};

/**
 * @method FS.File.prototype.isUploaded Is this file completely uploaded?
 * @public
 * @returns {boolean} True if the number of uploaded bytes is equal to the file size.
 */
FS.File.prototype.isUploaded = function() {
  var self = this;

  // Make sure we use the updated file record
  self.getFileRecord();

  return self.chunkCount === self.chunkSum;
};

/**
 * @method FS.File.prototype.hasCopy
 * @public
 * @param {string} storeName Name of the store to check for a copy of this file
 * @param {boolean} [optimistic=false] In case that the file record is not found, read below
 * @returns {boolean} If the copy exists or not
 *
 * > Note: If the file is not published to the client or simply not found:
 * this method cannot know for sure if it exists or not. The `optimistic`
 * param is the boolean value to return. Are we `optimistic` that the copy
 * could exist. This is the case in `FS.File.url` we are optimistic that the
 * copy supplied by the user exists.
 */
FS.File.prototype.hasCopy = function(storeName, optimistic) {
  var self = this;
  // Make sure we use the updated file record
  self.getFileRecord();
  // If we havent the published data then
  if (FS.Utility.isEmpty(self.copies)) {
    return !!optimistic;
  }
  if (typeof storeName === "string") {
    return (self.copies && !FS.Utility.isEmpty(self.copies[storeName]));
  }
  return false;
};

/**
 * @method FS.File.prototype.getCopyInfo
 * @public
 * @param {string} storeName Name of the store for which to get copy info.
 * @returns {Object} The file details, e.g., name, size, key, etc., specific to the copy saved in this store.
 */
FS.File.prototype.getCopyInfo = function(storeName) {
  var self = this;
  // Make sure we use the updated file record
  self.getFileRecord();
  return (self.copies && self.copies[storeName]) || null;
};
