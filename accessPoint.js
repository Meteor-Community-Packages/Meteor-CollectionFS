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

  FS.debug && console.log('Download ' + fileObj.name);

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
 * defined stores, even if a specific store name is passed. We don't allow
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

var APhandler = function(options) {
  options.headers = options.headers || [];

  return function(data) {
    var self = this;
    var query = self.query || {};
    var params = self.params || {};

    // Get the requested ID
    var id = params.id;
    if (!id) {
      throw new Meteor.Error(400, "Bad Request", "No file ID specified");
    }
    
    // Get the collection
    var collection = FS._collections[params.collectionName];
    if (!collection) {
      throw new Meteor.Error(404, "Not Found", "No collection has the name " + params.collectionName);
    }

    // Get the fsFile
    var file = collection.findOne({_id: '' + id});
    if (!file) {
      throw new Meteor.Error(404, "Not Found", "There is no file with ID " + id);
    }

    // If HTTP GET then return file
    if (self.method.toLowerCase() === 'get') {
      var copyInfo, filename;

      var storeName = params.store;
      if (typeof storeName !== "string") {
        // first store is considered the master store by default
        storeName = collection.options.stores[0].name;
      }

      copyInfo = file.copies[storeName];
      if (!copyInfo) {
        throw new Meteor.Error(404, "Not Found", "Invalid store name: " + storeName);
      }

      filename = copyInfo.name;
      if (typeof copyInfo.type === "string") {
        self.setContentType(copyInfo.type);
      }

      // Add 'Content-Disposition' header if requested a download/attachment URL
      if (typeof query.download !== "undefined") {
        self.addHeader('Content-Disposition', 'attachment; filename="' + filename + '"');

        // If a chunk/range was requested instead of the whole file, serve that
        var unit, start, end, range = self.requestHeaders.range;
        if (range) {
          // Parse range header
          range = range.split('=');

          unit = range[0];
          if (unit !== 'bytes')
            throw new Meteor.Error(416, "Requested Range Not Satisfiable");

          range = range[1];
          // Spec allows multiple ranges, but we will serve only the first
          range = range.split(',')[0];
          // Get start and end byte positions
          range = range.split('-');
          start = range[0];
          end = range[1] || '';
          // Convert to numbers and adjust invalid values when possible
          start = start.length ? Math.max(Number(start), 0) : 0;
          end = end.length ? Math.min(Number(end), copyInfo.size - 1) : copyInfo.size - 1;
          if (end < start)
            throw new Meteor.Error(416, "Requested Range Not Satisfiable");

          self.setStatusCode(206, 'Partial Content');
          self.addHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + copyInfo.size);
          end = end + 1; //HTTP end byte is inclusive and ours are not
        } else {
          self.setStatusCode(200);
        }
      } else {
        self.addHeader('Content-Disposition', 'inline');
        self.setStatusCode(200);
      }

      // Add any other custom headers
      _.each(options.headers, function(header) {
        self.addHeader(header[0], header[1]);
      });

      // Inform clients that we accept ranges for resumable chunked downloads
      self.addHeader('Accept-Ranges', 'bytes');

      return APDownload.call(self, file, storeName, start, end);
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

/** @method FS.AccessPoint.DDP.mountPut
 * @param {object} [options] Options
 * @param {array} [options.name='/cfs/files/put'] Define a custom method name
 *
 * Mounts an upload handler method with the given name
 */
FS.AccessPoint.DDP.mountPut = function(options) {
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

/** @method FS.AccessPoint.DDP.mountGet
 * @param {object} [options] Options
 * @param {array} [options.name='/cfs/files/get'] Define a custom method name
 * @todo possibly deprecate DDP downloads in favor of HTTP access point with "download" option
 *
 * Mounts a download handler method with the given name
 */
FS.AccessPoint.DDP.mountGet = function(options) {
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

FS.AccessPoint.HTTP = {};

var currentHTTPMethodName;
function unmountHTTPMethod() {
  if (currentHTTPMethodName) {
    var methods = {};
    methods[currentHTTPMethodName] = false;
    HTTP.methods(methods);
    currentHTTPMethodName = null;
  }
}

/** @method FS.AccessPoint.HTTP.mount
 * @param {object} [options] Options
 * @param {array} [options.baseUrl='/cfs/files'] Define a custom base URL. Must begin with a '/' but not end with one.
 * @param {array} [options.headers] Allows the user to set extra http headers
 * @todo support collection-specific header overrides
 *
 * > Mounts HTTP method at baseUrl/:collectionName/:id/:store?[download=true]
 */
FS.AccessPoint.HTTP.mount = function(options) {
  options = options || {};

  if (typeof HTTP === 'undefined' || typeof HTTP.methods !== 'function') {
    throw new Error('FS.AccessPoint.createHTTP: http-methods package not loaded');
  }

  var baseUrl = options.baseUrl;
  if (typeof baseUrl !== "string") {
    baseUrl = '/cfs/files';
  }
  
  var url = baseUrl + '/:collectionName/:id/:store';

  // Currently HTTP.methods is not implemented on the client
  if (Meteor.isServer) {
    // Unmount previously mounted URL
    unmountHTTPMethod();
    // We namespace with using the current Meteor convention - this could
    // change
    var methods = {};
    methods[url] = APhandler(options);
    HTTP.methods(methods);
    // Update current name for potential future unmounting
    currentHTTPMethodName = url;
  }

  FS.AccessPoint.HTTP.baseUrl = baseUrl;
};

// Mount defaults for use by all collections. You may call these
// again with custom method names if you don't like the default names.
FS.AccessPoint.HTTP.mount();
FS.AccessPoint.DDP.mountPut();
FS.AccessPoint.DDP.mountGet();
