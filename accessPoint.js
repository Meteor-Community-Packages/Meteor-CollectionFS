var APUpload = function(fileObj, data, start) {
  var self = this;
  check(fileObj, FS.File);
  if (!EJSON.isBinary(data))
    throw new Error("APUpload expects binary data");

  if (typeof start !== "number")
    start = 0;

  self.unblock();

  if (!fileObj.isMounted()) {
    return; // No file data found
  }

  // validators and temp store require that we have the full file record loaded
  fileObj.getFileRecord();

  if (typeof Package !== 'object' || !Package.insecure) {
    // Call user validators; use the "insert" validators
    // since uploading is part of insert.
    // Any deny returns true means denied.
    if (_.any(fileObj.collection.files._validators.insert.deny, function(validator) {
      return validator(self.userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
    // Any allow returns true means proceed. Throw error if they all fail.
    if (_.all(fileObj.collection.files._validators.insert.allow, function(validator) {
      return !validator(self.userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
  }

  // Save chunk in temporary store
  FS.TempStore.saveChunk(fileObj, data, start, function(err) {
    if (err) {
      throw new Error("Unable to load binary chunk at position " + start + ": " + err.message);
    }
  });

};

//

/**
 * Returns the data, or partial data, for the fileObj as stored in the
 * store with name storeName.
 *
 * Simply returns the result of fileObj.get() after checking "download"
 * allow/deny functions.
 *
 * @param {FS.File} fileObj
 * @param {String} storeName
 * @param {Number} [start]
 * @param {Number} [end]
 * @returns {undefined}
 */
var APDownload = function(fileObj, storeName, start, end) {
  var self = this;
  check(fileObj, FS.File);
  check(storeName, String);
  check(start, Match.Optional(Number));
  check(end, Match.Optional(Number));

  self.unblock();

  if (!fileObj.isMounted()) {
    return; // No file data found
  }

  // proper validation requires that we have the full file record loaded
  fileObj.getFileRecord();

  if (typeof Package !== 'object' || !Package.insecure) {
    // Call user validators; use the custom "download" validators
    // since uploading is part of insert.
    // Any deny returns true means denied.
    if (_.any(fileObj.collection._validators.download.deny, function(validator) {
      return validator(self.userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
    // Any allow returns true means proceed. Throw error if they all fail.
    if (_.all(fileObj.collection._validators.download.allow, function(validator) {
      return !validator(self.userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
  }

  return fileObj.get({
    storeName: storeName,
    start: start,
    end: end
  });
};

/**
 * Deletes fileObj. Always deletes the entire file record and all data from all
 * defined stores, even if a specific selector is passed. We don't allow
 * deleting from individual stores.
 * @param {FS.File} fileObj
 * @returns {undefined}
 */
var APDelete = function(fileObj) {
  var self = this;
  check(fileObj, FS.File);

  self.unblock();

  if (!fileObj.isMounted()) {
    return; // No file data found
  }

  // proper validation requires that we have the full file record loaded
  fileObj.getFileRecord();

  if (typeof Package !== 'object' || !Package.insecure) {
    // Call user validators; use the "remove" validators
    // since uploading is part of insert.
    // Any deny returns true means denied.
    if (_.any(fileObj.collection.files._validators.remove.deny, function(validator) {
      return validator(self.userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
    // Any allow returns true means proceed. Throw error if they all fail.
    if (_.all(fileObj.collection.files._validators.remove.allow, function(validator) {
      return !validator(self.userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
  }

  return fileObj.remove();
};

var APhandler = function(collection, download, options) {
  options.httpHeaders = options.httpHeaders || [];

  return function(data) {
    var self = this;
    var query = self.query || {};

    var id = self.params.id;
    if (!id) {
      throw new Meteor.Error(400, "Bad Request", "No file ID specified");
    }

    // Get the fsFile
    var file = collection.findOne({_id: '' + id});
    if (!file) {
      throw new Meteor.Error(404, "Not Found", "There is no file with ID " + id);
    }

    // If HTTP GET then return file
    if (self.method.toLowerCase() === 'get') {
      var copyInfo, filename;

      var storeName = self.params.selector;
      if (typeof storeName !== "string") {
        // first store is considered the master store by default
        storeName = collection.options.stores[0].name;
      }

      copyInfo = file.copies[storeName];
      if (!copyInfo) {
        throw new Meteor.Error(404, "Not Found", "Invalid selector: " + storeName);
      }

      filename = copyInfo.name;
      if (typeof copyInfo.type === "string") {
        self.setContentType(copyInfo.type);
      }

      // Add 'Content-Disposition' header if requested a download/attachment URL
      download && self.addHeader(
              'Content-Disposition',
              'attachment; filename="' + filename + '"'
              );

      // Add any other custom headers
      _.each(options.httpHeaders, function(header) {
        self.addHeader(header[0], header[1]);
      });

      self.setStatusCode(200);
      return APDownload.call(self, file, storeName, query.start, query.end);
    }

    // If HTTP PUT then put the data for the file
    else if (self.method.toLowerCase() === 'put') {
      return APUpload.call(self, file, data);
    }

    // If HTTP DEL then delete the file
    else if (self.method.toLowerCase() === 'del') {
      return APDelete.call(self, file);
    }
  };
};

/** @method FS.AccessPoint.DDP
 * @param {FS.Collection} cfs FS.Collection to create DDP access point for
 * @param {object} [options] Not used on the DDP access point
 *
 * > Mounts two DDP methods on:
 * > * /cfs/files/collectionName/put
 * > * /cfs/files/collectionName/get
 */
FS.AccessPoint.DDP = function(cfs, options) {
  var result = {};
  // We namespace with using the current Meteor convention - this could
  // change
  result[cfs.methodName + '/put'] = APUpload;
  result[cfs.methodName + '/get'] = APDownload;
  return result;
};

/** @method FS.AccessPoint.HTTP
 * @param {FS.Collection} cfs FS.Collection to create HTTP access point for
 * @param {object} [options] Options
 * @param {array} [options.httpHeaders] Allows the user to set extra http headers
 *
 * > Mounts four HTTP methods:
 * > With download headers set:
 * > * /cfs/files/collectionName/download/:id
 * > * /cfs/files/collectionName/download/:id/selector
 * > Regular HTTP methods
 * > * /cfs/files/collectionName/:id
 * > * /cfs/files/collectionName/:id/selector
 */
FS.AccessPoint.HTTP = function(cfs, options) {
  var result = {};
  // We namespace with using the current Meteor convention - this could
  // change
  // XXX: at some point we should remove the download flag in favour of just
  // adding the download headers from here...
  result[cfs.httpUrl + '/download/:id'] = APhandler(cfs, true, options);
  result[cfs.httpUrl + '/download/:id/:selector'] = APhandler(cfs, true, options);
  result[cfs.httpUrl + '/:id'] = APhandler(cfs, false, options);
  result[cfs.httpUrl + '/:id/:selector'] = APhandler(cfs, false, options);
  return result;
};
