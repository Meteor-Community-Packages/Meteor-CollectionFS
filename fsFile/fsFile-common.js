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
    self.loadBlob(new Blob([ref], {type: ref.type}));
  } else if (typeof Blob !== "undefined" && ref instanceof Blob) {
    self.utime = new Date();
    self.loadBlob(ref);
  }
};

// Converts EJSON binary to Buffer or Blob and saves in FS.File
FS.File.prototype.loadBinary = function(binary, type) {
  var self = this;
  self.binary = binary;
  if (Meteor.isServer) {
    self.loadBuffer(binaryToBuffer(binary));
  } else if (Meteor.isClient) {
    type = type || self.type;
    self.loadBlob(new Blob([binary], {type: type}));
  }
};

FS.File.prototype.toBinary = function(callback) {
  var self = this;

  if (typeof callback !== "function")
    throw new Error("FS.File.toBinary requires a callback");

  // Use binary if already present
  if (self.binary) {
    callback(self.binary);
  }

  // Convert Blob to binary and use that
  if (self.blob) {
    if (typeof FileReader === "undefined") {
      throw new Error("Browser does not support FileReader");
    }

    var reader = new FileReader();
    reader.onload = function() {
      var arrayBuffer = reader.result;
      var arrayBufferView = new Uint8Array(arrayBuffer);
      var len = arrayBuffer.byteLength;
      var bin = EJSON.newBinary(len);
      for (var i = 0; i < len; i++) {
        bin[i] = arrayBufferView[i];
      }
      self.binary = bin;
      callback(self.binary);
    };
    reader.onError = function(err) {
      throw err;
    };
    reader.readAsArrayBuffer(self.blob);
  }

  if (self.buffer) {
    self.binary = bufferToBinary(self.buffer);
    callback(self.binary);
  }
};

FS.File.prototype.getBytes = function(start, end, callback) {
  var self = this;

  if (typeof callback !== "function")
    throw new Error("FS.File.getBytes requires a callback");

  self.toBinary(function(data) {
    if (start >= data.length) {
      callback(new Error("FS.File getBytes: start position beyond end of data (" + data.length + ")"));
    }
    end = (end > data.length) ? data.length : end;
    var size = end - start;
    var chunk = EJSON.newBinary(size);
    for (var i = 0; i < size; i++) {
      chunk[i] = data[start + i];
    }
    callback(null, chunk);
  });
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
FS.File.prototype.remove = function(copyName) {
  var self = this;
  var id;
  // Apply title for error messages
  self.useCollection('FS.File remove _id: "' + self._id + '"', function() {
    // this is our collection
    id = this.remove({_id: self._id});
    delete self._id;
  });
  return id;
};

// Client: Downloads the binary data for the copy as a single chunk and then passes it to the callback
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
FS.File.prototype.url = function(copyName, auth) {
  var self = this;

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
    return collection.httpUrl + '/' + self._id + '/' + copyName + authToken;
  } else {
    return collection.httpUrl + '/' + self._id + authToken;
  }
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

FS.File.prototype.toDataUrl = function(callback) {
  var self = this;

  if (Meteor.isClient) {
    if (typeof callback !== 'function')
      throw new Error("toDataUrl requires function as callback");

    if (typeof FileReader === "undefined")
      throw new Error("Browser does not support FileReader");

    var fileReader = new FileReader();
    fileReader.onload = function(event) {
      callback(event.target.result);
    };

    if (self.blob) {
      fileReader.readAsDataURL(self.blob);
    }
  }

  else if (Meteor.isServer) {
    if (!self.buffer || !self.type)
      throw new Error("toDataUrl requires a buffer loaded in the FS.File and a contentType");

    var data_uri_prefix = "data:" + self.type + ";base64,";
    var url = data_uri_prefix + self.buffer.toString("base64");
    if (typeof callback === 'function') {
      callback(url);
    } else {
      return url;
    }
  }
};

// Load data from a URL into a new FS.File and pass it to callback
// callback(err, fsFile)
FS.File.fromUrl = function(url, filename, callback) {
  callback = callback || defaultCallback;
  var fsFile = new FS.File({name: filename});
  if (Meteor.isClient) {
    fsFile.loadBlobFromUrl(url, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, fsFile);
      }
    }); 
  } else if (Meteor.isServer) {
    //TODO create loadBufferFromUrl method in server code
//    fsFile.loadBufferFromUrl(url, function(err) {
//      if (err) {
//        callback(err);
//      } else {
//        callback(null, fsFile);
//      }
//    });
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