if (Meteor.isServer) {
  var path = Npm.require("path");
}

var validateAction = function validateAction(action, fileObj, collection, userId) {
  if (typeof Package !== 'object' || !Package.insecure) {
    if (!fileObj.isMounted()) {
      throw new Meteor.Error(400, "Bad Request");
    }
    // Any deny returns true means denied.
    if (_.any(collection._validators[action].deny, function(validator) {
      return validator(userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
    // Any allow returns true means proceed. Throw error if they all fail.
    if (_.all(collection._validators[action].allow, function(validator) {
      return !validator(userId, fileObj);
    })) {
      throw new Meteor.Error(403, "Access denied");
    }
  }
};

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

  validateAction('update', fileObj, fileObj.collection.files, self.userId);

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

  validateAction('download', fileObj, fileObj.collection, self.userId);

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

  validateAction('remove', fileObj, fileObj.collection.files, self.userId);

  return fileObj.remove();
};

var APhandler = function(options) {
  options.headers = options.headers || [];

  return function(data) {
    var self = this;
    var query = self.query || {};
    var params = self.params || {};
    var method = self.method.toLowerCase();
    var isPut = (method === 'put');

    // Get the collection
    var collection = FS._collections[params.collectionName];
    if (!collection) {
      throw new Meteor.Error(404, "Not Found", "No collection has the name " + params.collectionName);
    }

    // Get the requested ID
    var id = params.id;
    if (!id) {
      throw new Meteor.Error(400, "Bad Request", "No file ID specified");
    }
      
    // We have an id, so get the fsFile
    var file = collection.findOne({_id: '' + id});
    if (!file) {
      throw new Meteor.Error(404, "Not Found", "There is no file with ID " + id);
    }

    // If HTTP GET then return file
    if (method === 'get') {
      var copyInfo;

      var storeName = params.store;
      if (typeof storeName !== "string") {
        // first store is considered the master store by default
        storeName = collection.options.stores[0].name;
      }

      copyInfo = file.copies[storeName];
      if (!copyInfo) {
        throw new Meteor.Error(404, "Not Found", "Invalid store name: " + storeName);
      }

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
    else if (isPut) {
      return APUpload.call(self, file, FS.Utility.bufferToBinary(data));
    }

    // If HTTP DEL then delete the file
    else if (method === 'del') {
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

var currentHTTPMethodNames = [];
function unmountHTTPMethod() {
  if (currentHTTPMethodNames.length) {
    var methods = {};
    _.each(currentHTTPMethodNames, function (name) {
      methods[name] = false;
    });
    HTTP.methods(methods);
    currentHTTPMethodNames = [];
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
    methods[baseUrl + '/:collectionName/:filename'] = {
      put: function(data) {
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
        validateAction('insert', file, collection.files, self.userId);
        file = collection.insert(file);
        self.setStatusCode(200);
        return {_id: file._id};
      }
    };
    methods[url] = APhandler(options);
    HTTP.methods(methods);
    // Update current name for potential future unmounting
    currentHTTPMethodNames.push(url);
    currentHTTPMethodNames.push(baseUrl + '/:collectionName/:filename');
  }

  FS.AccessPoint.HTTP.baseUrl = baseUrl;
};

// Mount defaults for use by all collections. You may call these
// again with custom method names if you don't like the default names.
FS.AccessPoint.HTTP.mount();
FS.AccessPoint.DDP.mountPut();
FS.AccessPoint.DDP.mountGet();