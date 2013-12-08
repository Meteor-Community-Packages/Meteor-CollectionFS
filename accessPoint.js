// #############################################################################
//
// Access Point
//
// #############################################################################

var APUpload = function(fsFile, data, start, userId) {
  var self = this;
  check(fsFile, FS.File);
  if (!EJSON.isBinary(data))
    throw new Error("APUpload expects binary data");

  var collection = _collections[fsFile.collectionName];
  if (typeof collection === 'undefined' || collection === null) {
    throw new Meteor.Error(500, "FS.File has no collection");
  }

  // Call user validators; use the "insert" validators
  // since uploading is part of insert.
  // Any deny returns true means denied.
  if (_.any(collection.files._validators.insert.deny, function(validator) {
    return validator(self.userId, fsFile);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (_.all(collection.files._validators.insert.allow, function(validator) {
    return !validator(self.userId, fsFile);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }

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
  var self = this;
  self.unblock();

  var collection = _collections[fsFile.collectionName];
  if (typeof collection === 'undefined' || collection === null) {
    throw new Meteor.Error(500, "FS.File has no collection");
  }

  // Call user validators; use the custom "download" validators
  // since uploading is part of insert.
  // Any deny returns true means denied.
  if (_.any(collection._validators.download.deny, function(validator) {
    return validator(self.userId, fsFile);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (_.all(collection._validators.download.allow, function(validator) {
    return !validator(self.userId, fsFile);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }

  return fsFile.get(copyName, start, end);
};

// Deletes fsFile.
// Always deletes the entire file and all copies, even if a specific
// selector is passed. We don't allow deleting individual copies.
var APDelete = function(fsFile) {
  var self = this;
  self.unblock();

  var collection = _collections[fsFile.collectionName];
  if (typeof collection === 'undefined' || collection === null) {
    throw new Meteor.Error(500, "FS.File has no collection");
  }

  // Call user validators; use the "remove" validators
  // since uploading is part of insert.
  // Any deny returns true means denied.
  if (_.any(collection.files._validators.remove.deny, function(validator) {
    return validator(self.userId, fsFile);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (_.all(collection.files._validators.remove.allow, function(validator) {
    return !validator(self.userId, fsFile);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }

  return fsFile.remove();
};

var APhandler = function(collection, download) {
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
      if (download) {
        self.addHeader('Content-Disposition', 'attachment; filename="' +
                'download.' + file.getExtension() + '"');
      }
      
      self.setStatusCode(200);
      return APDownload.call(self, file, copyName, query.start, query.end);
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
  result[cfs.httpUrl + '/download/:id'] = APhandler(cfs, true);
  result[cfs.httpUrl + '/download/:id/:selector'] = APhandler(cfs, true);
  result[cfs.httpUrl + '/:id'] = APhandler(cfs);
  result[cfs.httpUrl + '/:id/:selector'] = APhandler(cfs);
  return result;
};