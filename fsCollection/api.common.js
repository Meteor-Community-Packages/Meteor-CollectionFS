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
    fileObj = new FS.File(doc);
    doInsert();
  } else {
    var e = new Error('FS.Collection insert expects FS.File');
    if (typeof callback === 'function') {
      callback(e);
    } else {
      throw e;
    }
  }

  // We return the FS.File
  return fileObj;
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