if (Meteor.isClient) {
  // There is a single uploads transfer queue per client (not per CFS)
  FS.downloadQueue = new TransferQueue();

  // There is a single downloads transfer queue per client (not per CFS)
  FS.uploadQueue = new TransferQueue(true);
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
FS.File.prototype.useCollection = function(title, func) {
  // Get the collection reference
  var self = this;
  var collection = _collections[self.collectionName];
  if (collection) {
    try {
      return func.apply(collection.files);
    } catch (err) {
      throw new Error(title + ', Error: ' + (err.stack || err.message));
    }
  } else {
    if (self.collectionName) {
      // if images.files we use the images part since this is known to the user
      var prefix = self.collectionName.split('.')[0];
      throw new Error(title + ', Error: FS.Collection "' + prefix + '" not found');
    } else {
      throw new Error(title + ', Error: No FS.Collection found');
    }
  }
};

FS.File.prototype.reload = function() {
  var self = this;
  self.useCollection('FS.File reload of _id: "' + self._id + '"', function() {
    var ref = this.findOne({_id: self._id});
    if (ref) {
      _.extend(self, cloneFileRecord(ref));
    }
  });
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
    var collection = this;
    if (callback) {
      return collection.update({_id: self._id}, modifier, options, function(err, count) {
        if (count) {
          // Update self with any changes
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
        var ref = collection.findOne({_id: self._id});
        if (ref) {
          _.extend(self, cloneFileRecord(ref));
        }
      }
      return count;
    }
  });
};

// Remove the file TODO: self destruct?
FS.File.prototype.remove = function() {
  var self = this;
  var count;
  // Remove any associated temp files
  if (Meteor.isServer) {
    self.deleteTempFiles(function (err) {
      if (err) {
        console.log(err);
      }
    });
  }
  // Apply title for error messages
  self.useCollection('FS.File remove _id: "' + self._id + '"', function() {
    // this is our collection
    count = this.remove({_id: self._id});
    delete self._id;
    delete self.binary;
  });
  return count;
};

// Client: Downloads the binary data for the copy and then saves it
// Server: Returns the Buffer data for the copy (synchronous) or passes it to an optional callback
FS.File.prototype.get = function(/* copyName, start, end, callback */) {
  var self = this;
  var args = parseArguments(arguments,
          [["copyName"], ["start"], ["end"], ["callback"]],
          [String, Number, Number, Function]);
  if (args instanceof Error)
    throw args;
  var copyName = args.copyName,
          callback = args.callback,
          start = args.start,
          end = args.end,
          partial = false;
  if (start instanceof Number && end instanceof Number) {
    partial = true;
  }

  // On the client we download the file via transfer queue
  if (Meteor.isClient) {
    FS.downloadQueue.downloadFile(self, copyName);
  } else if (Meteor.isServer) {
    var collection = _collections[self.collectionName];
    if (typeof collection === 'undefined' || collection === null) {
      return handleError(callback, 'FS.File.get no collection assigned');
    }

    var store = collection.getStoreForCopy(copyName);

    if (typeof store === 'undefined' || store === null) {
      return handleError(callback, 'FS.File.get could not find "' + (copyName || 'master') + '" Storage Adapter on FS.Collection "' + collection.name + '"');
    }

    // On server we contact the storage adapter
    if (callback) {
      if (partial) {
        if (!(typeof store.getBytes === "function")) {
          callback(new Error('FS.File.get storage adapter for "' + (copyName || 'master') + '" does not support partial retrieval'));
          return;
        }
        store.getBytes(self, start, end, {copyName: copyName}, function(err, bytesRead, buffer) {
          if (buffer) {
            buffer = bufferToBinary(buffer);
          }
          callback(err, bytesRead, buffer);
        });
      } else {
        store.getBuffer(self, {copyName: copyName}, function(err, buffer) {
          if (buffer) {
            buffer = bufferToBinary(buffer);
          }
          callback(err, buffer);
        });
      }
    } else {
      if (partial) {
        if (!(typeof store.getBytes === "function")) {
          throw new Error('FS.File.get storage adapter for "' + (copyName || 'master') + '" does not support partial retrieval');
        }
        //if callback is undefined, getBuffer will be synchrononous
        var buffer = store.getBytes(self, start, end, {copyName: copyName});
        return bufferToBinary(buffer);
      } else {
        //if callback is undefined, getBuffer will be synchrononous
        var buffer = store.getBuffer(self, {copyName: copyName});
        return bufferToBinary(buffer);
      }
    }
  }
};

// Return the http url for getting the file - on server set auth if wanting to
// use authentication on client set auth to true or token
FS.File.prototype.url = function(copyName, auth, download) {
  var self = this;

  var urlPrefix = (download)?'/download/':'/';

  if (copyName && (!self.copies || !self.copies[copyName])) {
    return null;
  }

  if (!copyName && !self.master) {
    return null;
  }

  var collection = _collections[self.collectionName];
  if (typeof collection === 'undefined') {
    throw new Error('FS.File.url no collection assigned');
  }

  if (!collection.httpUrl) {
    throw new Error('FS.File.url FS.Collection "' + collection.name + '" has no HTTP access point; set useHTTP option to true');
  }
  var authToken = '';

  // TODO: Could we somehow figure out if the collection requires login?
  if (typeof auth !== 'undefined') {
    if (auth === true) {
      authToken = (typeof Accounts !== "undefined" && Accounts._storedLoginToken()) || '';
    } else {
      authToken = auth || '';
    }

    if (authToken !== '') {
      // Construct the token string to append to url
      authToken = '?token=' + authToken;
    }
  }

  // Construct the http method url
  if (copyName) {
    return collection.httpUrl + urlPrefix + self._id + '/' + copyName + authToken;
  } else {
    return collection.httpUrl + urlPrefix + self._id + authToken;
  }
};

// Construct a download url
FS.File.prototype.downloadUrl = function(copyName, auth) {
  return FS.File.prototype.url.call(this, copyName, auth, true);
};

FS.File.prototype.put = function(callback) {
  console.log('PUT---------');
  var self = this;

  callback = callback || defaultCallback;

  // Get collection reference
  var collection = _collections[self.collectionName];

  // We have to have the file in the FS.Collection first
  if (!self._id || !collection) {
    callback(new Error("FS.File put needs collection and _id"));
    return;
  }

  if (Meteor.isClient && !FS.uploadQueue.isUploadingFile(self)) {
    FS.uploadQueue.uploadFile(self);
    callback(null, self._id);
  } else if (Meteor.isServer) {
    // We let the collection handle the storage adapters
    collection.saveMaster(self, {missing: true});
    collection.saveCopies(self, {missing: true});
    callback(null, self._id);
  }
};

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
  var self = this;
  return (typeof self.master === "object");
};

FS.File.prototype.hasCopy = function(copyName) {
  var self = this;
  return (self.copies && self.copies[copyName] && typeof self.copies[copyName] === "object");
};

FS.File.prototype.fileIsAllowed = function() {
  var self = this;
  var collection = _collections[self.collectionName];
  if (typeof collection === 'undefined') {
    throw new Error('FS.File.fileIsAllowed no collection assigned');
  }
  var filter = collection.options.filter;
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