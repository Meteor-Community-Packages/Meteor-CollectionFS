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
  options.headers = options.headers || [];

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
      _.each(options.headers, function(header) {
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

FS.AccessPoint.DDP = {};

/** @method FS.AccessPoint.createDDPPut
 * @param {object} [options] Options
 * @param {array} [options.name='/cfs/files/put'] Define a custom method name
 *
 * Mounts an upload handler method with the given name
 */
FS.AccessPoint.mountDDPPut = function(options) {
  options = options || {};
  
  var name = options.name;
  if (typeof name !== "string") {
    name = '/cfs/files/put';
  }
  
  var methods = {};
  methods[name] = APUpload;
  Meteor.methods(methods);
  
  FS.AccessPoint.DDP.put = name;
};

/** @method FS.AccessPoint.createDDPGet
 * @param {object} [options] Options
 * @param {array} [options.name='/cfs/files/get'] Define a custom method name
 *
 * Mounts a download handler method with the given name
 */
FS.AccessPoint.mountDDPGet = function(options) {
  options = options || {};
  
  var name = options.name;
  if (typeof name !== "string") {
    name = '/cfs/files/get';
  }

  var methods = {};
  methods[name] = APDownload;
  Meteor.methods(methods);
  
  FS.AccessPoint.DDP.get = name;
};

/** @method FS.AccessPoint.mountHTTP
 * @param {FS.Collection} cfs FS.Collection to mount HTTP access points for
 * @param {object} [options] Options
 * @param {array} [options.baseUrl='/cfs/files/collectionName'] Define a custom base URL. Must begin with a '/' but not end with one.
 * @param {array} [options.headers] Allows the user to set extra http headers
 *
 * > Mounts four HTTP methods:
 * > With download headers set:
 * > * /cfs/files/collectionName/download/:id
 * > * /cfs/files/collectionName/download/:id/selector
 * > Regular HTTP methods
 * > * /cfs/files/collectionName/:id
 * > * /cfs/files/collectionName/:id/selector
 */
FS.AccessPoint.createHTTP = function(cfs, options) {
  options = options || {};
  
  if (typeof HTTP === 'undefined' || typeof HTTP.methods !== 'function') {
    throw new Error('FS.AccessPoint.createHTTP: http-methods package not loaded');
  }
  
  var baseUrl = options.baseUrl;
  if (typeof baseUrl !== "string") {
    baseUrl = '/cfs/files/' + cfs.name;
  }
  
  // We namespace with using the current Meteor convention - this could
  // change
  var methods = {};
  methods[baseUrl + '/download/:id'] = APhandler(cfs, true, options);
  methods[baseUrl + '/download/:id/:selector'] = APhandler(cfs, true, options);
  methods[baseUrl + '/:id'] = APhandler(cfs, false, options);
  methods[baseUrl + '/:id/:selector'] = APhandler(cfs, false, options);
  
  HTTP.methods(methods);
  
  return baseUrl;
};

// Mount defaults for use by all collections. You may call these
// again with custom method names if you don't like the default names.
FS.AccessPoint.mountDDPPut();
FS.AccessPoint.mountDDPGet();