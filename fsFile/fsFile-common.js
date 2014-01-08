if (Meteor.isClient) {
  // There is a single uploads transfer queue per client (not per CFS)
  FS.downloadQueue = new DownloadTransferQueue();

  // There is a single downloads transfer queue per client (not per CFS)
  FS.uploadQueue = new UploadTransferQueue();
}

FS.File = function(ref) {
  var self = this;

  if (typeof ref !== 'object')
    throw new Error('FS.File expects an object as argument');

  _.extend(self, cloneFileRecord(ref));

  if (typeof File !== "undefined" && ref instanceof File) {
    self.utime = ref.lastModifiedDate;
    self.blob = ref; // File inherits from Blob so this is OK
  } else if (typeof Blob !== "undefined" && ref instanceof Blob) {
    self.utime = new Date;
    self.blob = ref;
  }
};

// This is a collection wrapper with error messages, primarily for internal use
FS.File.prototype.useCollection = function(title, func, onError) {
  // Get the collection reference
  var self = this;
  var collection = _collections[self.collectionName];
  if (collection) {
    try {
      return func.apply(collection);
    } catch (err) {
      if (typeof onError === "function") {
        onError(err);
      } else {
        throw new Error(title + ', Error: ' + (err.stack || err.message));
      }
    }
  } else {
    if (self.collectionName) {
      // if images.files we use the images part since this is known to the user
      var prefix = self.collectionName.split('.')[0];
      var err = new Error(title + ', Error: FS.Collection "' + prefix + '" not found');
      if (typeof onError === "function") {
        onError(err);
      } else {
        throw err;
      }
    } else {
      var err = new Error(title + ', Error: No FS.Collection found');
      if (typeof onError === "function") {
        onError(err);
      } else {
        throw err;
      }
    }
  }
};

// Update the fileRecord
FS.File.prototype.update = function(modifier, options, callback) {
  var self = this;
  if (!callback && typeof options === "function") {
    callback = options;
    options = {};
  }
  if (Meteor.isClient && !callback) {
    // Since the client can't block and we need to update self after being
    // sure the update went through, we need a callback
    throw new Error("FS.File.update requires a callback");
  }

  // Apply title for error messages
  return self.useCollection('FS.File update of _id: "' + self._id + '"', function() {
    // this is our collection
    var collection = this.files;
    if (callback) {
      return collection.update({_id: self._id}, modifier, options, function(err, count) {
        if (count) {
          // Update self with any changes
          // TODO would self = self.fetch() work here?
          var ref = collection.findOne({_id: self._id});
          if (ref) {
            _.extend(self, cloneFileRecord(ref));
          }
        }
        callback(err, count);
      });
    } else {
      var count = collection.update({_id: self._id}, modifier, options);
      if (count) {
        // Update self with any changes
        // TODO would self = self.fetch() work here?
        var ref = collection.findOne({_id: self._id});
        if (ref) {
          _.extend(self, cloneFileRecord(ref));
        }
      }
      return count;
    }
  });
};

// Remove the file
FS.File.prototype.remove = function() {
  var self = this;
  var count;
  // Remove any associated temp files
  if (Meteor.isServer) {
    TempStore.deleteChunks(self);
  }
  // Apply title for error messages
  self.useCollection('FS.File remove _id: "' + self._id + '"', function() {
    // this is our collection
    count = this.files.remove({_id: self._id});
    delete self._id;
    delete self.binary;
  });
  return count;
};

// Client: Instructs the DownloadTransferQueue to begin downloading the file copy
// Server: Returns the Buffer data for the copy
FS.File.prototype.get = function(/* copyName, start, end*/) {
  var self = this;
  var args = parseArguments(arguments,
          [["copyName"], ["start"], ["end"]],
          [String, Number, Number]);
  if (args instanceof Error)
    throw args;
  var copyName = args.copyName;
  var start = args.start;
  var end = args.end;
  var partial = (typeof start === "number" && typeof end === "number");

  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  

  // On the client we download the file via transfer queue
  if (Meteor.isClient) {
    FS.downloadQueue.downloadFile(self, copyName);
  }

  // On server we contact the storage adapter
  else if (Meteor.isServer) {
    return self.useCollection('FS.File.get', function() {
      var store = this.getStoreForCopy(copyName);

      if (typeof store === 'undefined' || store === null) {
        throw new Error('FS.File.get could not find "' + copyName + '" Storage Adapter on FS.Collection "' + this.name + '"');
      }

      if (partial) {
        if (!(typeof store.getBytes === "function")) {
          throw new Error('FS.File.get: storage adapter for "' + copyName + '" does not support partial retrieval');
        }
        end = (end > self.size - 1) ? self.size : end;
        var buffer = store.getBytes(self, start, end, {copyName: copyName});
        return bufferToBinary(buffer);
      } else {
        var buffer = store.getBuffer(self, {copyName: copyName});
        return bufferToBinary(buffer);
      }

    });
  }
};

/** @method FS.File.prototype.url Construct the file url
  * @param {object} [options]
  * @param {string} [options.copy="_master"] The copy of the file to get
  * @param {boolean} [auth=null] Wether or not the authenticate
  * @param {boolean} [download=true] Should headers be set to force a download
  *
  * Return the http url for getting the file - on server set auth if wanting to
  * use authentication on client set auth to true or token
  */
FS.File.prototype.url = function(options) {
  var self = this;
  options = options || {};
  options = _.extend({
    copy: "_master",
    auth: null,
    download: false
  }, options.hash || options); // check for "hash" prop if called as helper

  // We check if the copy is found
  if (!self.hasCopy(options.copy, true)) {
    return null;
  }

  return self.useCollection('FS.File.url', function() {
    if (!this.httpUrl) {
      throw new Error('FS.File.url FS.Collection "' + this.name + '" has no HTTP access point; set useHTTP option to true');
    }
    var authToken = '';

    // TODO: Could we somehow figure out if the collection requires login?
    if (options.auth) {
      if (options.auth === true) {
        authToken = (typeof Accounts !== "undefined" && Accounts._storedLoginToken()) || '';
      } else {
        authToken = options.auth || '';
      }

      if (authToken !== '') {
        // Construct the token string to append to url
        authToken = '?token=' + authToken;
      }
    }

    // Construct the http method url
    var urlPrefix = (options.download) ? '/download/' : '/';
    if (options.copy && options.copy !== "_master") {
      return this.httpUrl + urlPrefix + self._id + '/' + options.copy + authToken;
    } else {
      return this.httpUrl + urlPrefix + self._id + authToken;
    }
  });
};

/** @method FS.File.prototype.downloadUrl Get the download url
  * @param {object} [options]
  * @param {string} [options.copy="_master"] The copy of the file to get
  * @param {boolean} [auth=null] Wether or not the authenticate
  * @deprecated Use The hybrid helper `FS.File.url`
  */
// Construct a download url
FS.File.prototype.downloadUrl = function(options) {
  options = options || {};
  options = options.hash || options;
  options.download = true;
  return FS.File.prototype.url.call(this, options);
};

/** @method FS.File.prototype.put Stores the file data
  * @param {function} [callback] Callback for returning errors and id
  *
```
  fo.put(function(err, id) {
    if (err) {
      console.log('Got an error');
    } else {
      console.log('Passed on the file id: ' + id);
    }
  });
```
  */
FS.File.prototype.put = function(callback) {
  var self = this;

  callback = callback || defaultCallback;

  if (!self._id) {
    callback(new Error("FS.File.put needs _id"));
    return;
  }

  if (Meteor.isClient && !FS.uploadQueue.isUploadingFile(self)) {
    FS.uploadQueue.uploadFile(self);
    callback(null, self._id);
  } else if (Meteor.isServer) {
    // Force bytesUploaded to be equal to the file size in case
    // this was a server insert or a non-chunked client upload.
    self.update({$set: {bytesUploaded: self.size}}, function(err) {
      if (err) {
        callback(err);
      } else {
        // Now let the collection handle the storage adapters
        self.useCollection('FS.File.put', function() {
          this.saveCopies(self, {missing: true});
          callback(null, self._id);
        }, callback);
      }
    });
  }
};

/** @method FS.File.prototype.getExtension Returns the file extension
  * @returns {string | null} The extension eg.: `jpg`
  * @todo We have to make this function be able to get the name from `self.fetch()`
  */
FS.File.prototype.getExtension = function() {
  var self = this;
  var name = self.name;
  var found = name.lastIndexOf('.') + 1;
  return (found > 0 ? name.substr(found) : null);
};

// callback(err, dataUrl) (callback is optional on server)
FS.File.prototype.toDataUrl = function(callback) {
  var self = this;

  if (Meteor.isClient) {
    if (typeof callback !== 'function')
      throw new Error("toDataUrl requires function as callback");

    if (typeof FileReader === "undefined") {
      callback(new Error("Browser does not support FileReader"));
      return;
    }

    var fileReader = new FileReader();
    fileReader.onload = function(event) {
      callback(null, event.target.result);
    };
    fileReader.onerror = function(err) {
      callback(err);
    };
    try {
      var blob = self.getBlob();
      fileReader.readAsDataURL(blob);
    } catch (err) {
      callback(err);
    }
  }

  else if (Meteor.isServer) {
    var hasCallback = (typeof callback === 'function');
    callback = callback || defaultCallback;
    var buffer = self.getBuffer();
    if (!buffer || !self.type) {
      callback(new Error("toDataUrl requires a buffer loaded in the FS.File and a contentType"));
      return;
    }

    var data_uri_prefix = "data:" + self.type + ";base64,";
    var url = data_uri_prefix + buffer.toString("base64");
    if (hasCallback) {
      callback(null, url);
    } else {
      return url;
    }
  }
};

FS.File.prototype.isImage = function() {
  var self = this;
  if (typeof self.type !== "string") {
    return false;
  }
  return self.type.indexOf("image/") === 0;
};

FS.File.prototype.isUploaded = function() {
  var self = this;
  return self.bytesUploaded === self.size;
};

FS.File.prototype.hasMaster = function() {
  return this.hasCopy("_master");
};

/** @method FS.File.prototype.fetch Returns the fileRecord
  * @returns {object} The filerecord
  */
FS.File.prototype.fetch = function() {
  var self = this;
  return self.useCollection('FS.File fetch of _id: "' + self._id + '"', function() {
    return this.files.findOne({_id: self._id});
  });
};

/** @method FS.File.prototype.hasCopy
  * @param {string} copyName Name of the copy to check for
  * @param {boolean} optimistic In case that the file record is not found, read below
  * @returns {boolean} If the copy exists or not
  *
  * > Note: If the file is not published to the client or simply not found:
  * > this method cannot know for sure if it exists or not. The `optimistic`
  * > param is the boolean value to return. Are we `optimistic` that the copy
  * > could exist. This is the case in `FS.File.url` we are optimistic that the
  * > copy supplied by the user exists.
  */
FS.File.prototype.hasCopy = function(copyName, optimistic) {
  var self = this;
  var fileRecord = self.fetch();
  // If we havent the published data then
  if (typeof fileRecord === 'undefined') {
    return !!optimistic;
  }
  if (typeof copyName === "string") {
    return (fileRecord.copies && !_.isEmpty(fileRecord.copies[copyName]));
  }
  return false;
};

FS.File.prototype.fileIsAllowed = function() {
  var self = this;
  return self.useCollection('FS.File.fileIsAllowed', function() {
    var filter = this.options.filter;
    if (!filter) {
      return true;
    }
    var fileSize = self.size, contentType = self.type;
    if (!contentType || !self.name || !fileSize || isNaN(fileSize)) {
      if (typeof filter.onInvalid === "function") {
        filter.onInvalid("File is missing required information");
      }
      return false;
    }
    if (typeof filter.maxSize === "number" && fileSize > filter.maxSize) {
      if (typeof filter.onInvalid === "function") {
        filter.onInvalid("File is too big");
      }
      return false;
    }
    var saveAllFileExtensions = (filter.allow.extensions.length === 0);
    var saveAllContentTypes = (filter.allow.contentTypes.length === 0);
    var ext = self.getExtension();
    if (!((saveAllFileExtensions ||
            _.indexOf(filter.allow.extensions, ext) !== -1) &&
            _.indexOf(filter.deny.extensions, ext) === -1)) {
      if (typeof filter.onInvalid === "function") {
        filter.onInvalid("Files with extension " + ext + " are not allowed");
      }
      return false;
    }
    if (!((saveAllContentTypes ||
            contentTypeInList(filter.allow.contentTypes, contentType)) &&
            !contentTypeInList(filter.deny.contentTypes, contentType))) {
      if (typeof filter.onInvalid === "function") {
        filter.onInvalid("Files of type " + contentType + " are not allowed");
      }
      return false;
    }
    return true;
  });
};

var contentTypeInList = function(list, contentType) {
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
};