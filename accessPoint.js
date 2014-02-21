if (Meteor.isServer) {
  var path = Npm.require("path");
}

/**
 * @method validateAction
 * @private
 * @param {Object} validators - The validators object to use, with `deny` and `allow` properties.
 * @param {FS.File} fileObj - Mounted or mountable file object to be passed to validators.
 * @param {String} userId - The ID of the user who is attempting the action.
 * @returns {undefined}
 * 
 * Throws a "400-Bad Request" Meteor error if the action is not allowed.
 */
var validateAction = function validateAction(validators, fileObj, userId) {
  var denyValidators = validators.deny;
  var allowValidators = validators.allow;

  // If insecure package is used and there are no validators defined,
  // allow the action.
  if (typeof Package === 'object'
          && Package.insecure
          && denyValidators.length + allowValidators.length === 0) {
    return;
  }

  // Validators should receive a fileObj that is mounted
  if (!fileObj.isMounted()) {
    throw new Meteor.Error(400, "Bad Request");
  }

  // Any deny returns true means denied.
  if (_.any(denyValidators, function(validator) {
    return validator(userId, fileObj);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (_.all(allowValidators, function(validator) {
    return !validator(userId, fileObj);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
};

/**
 * @method APUpload
 * @private
 * @param {FS.File} fileObj - The file object for which we're uploading data.
 * @param {binary} data - Binary data
 * @param {Number} [start=0] - Start position in file at which to write this data chunk.
 * @returns {undefined}
 * 
 * The DDP upload access point.
 */
var APUpload = function APUpload(fileObj, data, start) {
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

  validateAction(fileObj.collection.files._validators['update'], fileObj, self.userId);

  // Save chunk in temporary store
  FS.TempStore.saveChunk(fileObj, data, start, function(err) {
    if (err) {
      throw new Error("Unable to load binary chunk at position " + start + ": " + err.message);
    }
  });

};

/**
 * @method APDownload
 * @private
 * @param {FS.File} fileObj - The file object for which to download data.
 * @param {String} storeName - The name of the store from which we want data.
 * @param {Number} [start=0] - Start position for the data chunk to be returned.
 * @param {Number} [end=end of file] - End position for the data chunk to be returned.
 * @returns {undefined}
 * 
 * Returns the data, or partial data, for the `fileObj` as stored in the
 * store with name `storeName`.
 *
 * Simply returns the result of fileObj.get() after checking "download"
 * allow/deny functions.
 */
var APDownload = function APDownload(fileObj, storeName, start, end) {
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

  validateAction(fileObj.collection._validators['download'], fileObj, self.userId);

  return fileObj.get({
    storeName: storeName,
    start: start,
    end: end
  });
};

/**
 * @method APDelete
 * @private
 * @param {FS.File} fileObj - File to be deleted.
 * @returns {undefined}
 * 
 * Deletes fileObj. Always deletes the entire file record and all data from all
 * defined stores, even if a specific store name is passed. We don't allow
 * deleting from individual stores.
 */
var APDelete = function APDelete(fileObj) {
  var self = this;
  check(fileObj, FS.File);

  self.unblock();

  if (!fileObj.isMounted()) {
    return; // No file data found
  }

  // proper validation requires that we have the full file record loaded
  fileObj.getFileRecord();

  validateAction(fileObj.collection.files._validators['remove'], fileObj, self.userId);

  return fileObj.remove();
};

/**
 * @method APhandler
 * @private
 * @param {Object} [options]
 * @param {Object} [options.headers] - Additional HTTP headers to include with the response.
 * @returns {any} response
 * 
 * HTTP request handler
 */
var APhandler = function APhandler(options) {
  options.headers = options.headers || [];

  return function(data) {
    var self = this;
    var query = self.query || {};
    var params = self.params || {};
    var method = self.method.toLowerCase();

    // Get the collection
    var collection = FS._collections[params.collectionName];
    if (!collection) {
      throw new Meteor.Error(404, "Not Found", "No collection has the name " + params.collectionName);
    }

    // Get the store
    var storeName = params.store;
    if (typeof storeName !== "string") {
      // first store is considered the master store by default
      storeName = collection.options.stores[0].name;
    }

    // Get the requested fileKey
    var fileKey = params.key;
    if (!fileKey) {
      throw new Meteor.Error(400, "Bad Request", "No file key specified");
    }

    // We have a file key, so get the fsFile
    var query = {};
    query['copies.' + storeName + '.key'] = '' + fileKey;
    var file = collection.findOne(query);
    if (!file) {
      throw new Meteor.Error(404, "Not Found", 'There is no file with the key "' + fileKey + '"');
    }

    // If HTTP GET then return file
    if (method === 'get') {
      var copyInfo = file.copies[storeName];

      if (typeof copyInfo.type === "string") {
        self.setContentType(copyInfo.type);
      } else {
        self.setContentType('application/octet-stream');
      }

      // Add 'Content-Disposition' header if requested a download/attachment URL
      var start, end;
      if (typeof query.download !== "undefined") {
        self.addHeader('Content-Disposition', 'attachment; filename="' + copyInfo.name + '"');

        // If a chunk/range was requested instead of the whole file, serve that
        var unit, range = self.requestHeaders.range;
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
    else if (method === 'put') {
      return APUpload.call(self, file, FS.Utility.bufferToBinary(data));
    }

    // If HTTP DEL then delete the file
    else if (method === 'del') {
      return APDelete.call(self, file);
    }
  };
};

var httpPutHandler = function httpPutHandler(data) {
  var self = this;
  var params = this.params;
  var filename = params.filename;

  if (path && !path.extname(filename).length) {
    throw new Meteor.Error(400, "Bad Request", "Filename must have an extension");
  }

  // Get the collection
  var collection = FS._collections[params.collectionName];
  if (!collection) {
    throw new Meteor.Error(404, "Not Found", "No collection has the name " + params.collectionName);
  }

  // Create file object. TODO put in real filename.
  var file = new FS.File({
    name: filename
  });
  file.setDataFromBuffer(data, self.requestHeaders['content-type']);
  file.collectionName = params.collectionName;
  validateAction(collection.files._validators['insert'], file, self.userId);
  file = collection.insert(file);
  self.setStatusCode(200);
  return {_id: file._id};
};

FS.AccessPoint.DDP = {};

/** 
 * @method FS.AccessPoint.DDP.mountPut
 * @public
 * @param {object} [options] Options
 * @param {array} [options.name='/cfs/files/put'] Define a custom method name
 *
 * Mounts an upload handler method with the given name.
 */
FS.AccessPoint.DDP.mountPut = function(options) {
  options = options || {};

  var name = options.name;
  if (typeof name !== "string") {
    name = '/cfs/files/put';
  }

  // We don't need or want client simulations
  if (Meteor.isServer) {
    var methods = {};
    methods[name] = APUpload;
    Meteor.methods(methods);
  }

  FS.AccessPoint.DDP.put = name;
};

/** 
 * @method FS.AccessPoint.DDP.mountGet
 * @public
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

  // We don't need or want client simulations
  if (Meteor.isServer) {
    var methods = {};
    methods[name] = APDownload;
    Meteor.methods(methods);
  }

  FS.AccessPoint.DDP.get = name;
};

FS.AccessPoint.HTTP = {};

var currentHTTPMethodNames = [];
function unmountHTTPMethod() {
  if (currentHTTPMethodNames.length) {
    var methods = {};
    _.each(currentHTTPMethodNames, function(name) {
      methods[name] = false;
    });
    HTTP.methods(methods);
    currentHTTPMethodNames = [];
  }
}

/** 
 * @method FS.AccessPoint.HTTP.mount
 * @public
 * @param {object} [options] Options
 * @param {array} [options.baseUrl='/cfs/files'] Define a custom base URL. Must begin with a '/' but not end with one.
 * @param {array} [options.headers] Allows the user to set extra http headers
 * @todo support collection-specific header overrides
 *
 * Mounts HTTP method at baseUrl/:collectionName/:id/:store?[download=true]
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

  // We don't need or want client simulations
  if (Meteor.isServer) {
    // Unmount previously mounted URL
    unmountHTTPMethod();
    // We namespace with using the current Meteor convention - this could
    // change
    var url = baseUrl + '/:collectionName/:store/:key';
    var putUrl = baseUrl + '/:collectionName/:filename';
    var methods = {};
    methods[putUrl] = {
      put: httpPutHandler
    };
    methods[url] = APhandler(options);
    HTTP.methods(methods);
    // Update current name for potential future unmounting
    currentHTTPMethodNames.push(url);
    currentHTTPMethodNames.push(putUrl);
  }

  FS.AccessPoint.HTTP.baseUrl = baseUrl;
};

// Mount defaults for use by all collections. You may call these
// again with custom method names if you don't like the default names.
FS.AccessPoint.HTTP.mount();
FS.AccessPoint.DDP.mountPut();
FS.AccessPoint.DDP.mountGet();