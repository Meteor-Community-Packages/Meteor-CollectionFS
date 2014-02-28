baseUrlForGetAndDel = '/cfs/files';
var getHeaders = [];

FS.HTTP = FS.HTTP || {};

/**
 * @method FS.HTTP.setBaseUrl
 * @public
 * @param {String} baseUrl - Change the base URL for the HTTP GET and DEL endpoints.
 * @returns {undefined}
 */
FS.HTTP.setBaseUrl = function setBaseUrl(baseUrl) {

  // Adjust the baseUrl if necessary
  if (baseUrl.slice(0, 1) !== '/') {
    baseUrl = '/' + baseUrl;
  }
  if (baseUrl.slice(-1) === '/') {
    baseUrl = baseUrl.slice(0, -1);
  }

  // Update the base URL
  baseUrlForGetAndDel = baseUrl;

  // Remount URLs with the new baseUrl, unmounting the old, on the server only
  Meteor.isServer && mountUrls();
};

FS.HTTP.setHeadersForGet = function setHeadersForGet(headers) {
  getHeaders = headers;
};

/**
 * @method httpGetDelHandler
 * @private
 * @returns {any} response
 * 
 * HTTP GET and DEL request handler
 */
function httpGetDelHandler(data) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});

  var collectionName = opts.collectionName;
  var id = opts.id;
  var store = opts.store;
  var download = opts.download;
  var metadata = opts.metadata;

  // Get the collection
  var collection = FS._collections[collectionName];
  if (!collection) {
    throw new Meteor.Error(404, "Not Found", "No collection has the name " + collectionName);
  }

  // If id, response will be file data or metadata
  if (id) {
    // If no store was specified, use the first defined store
    if (typeof store !== "string") {
      store = collection.options.stores[0].name;
    }

    // Get the requested file
    var file = collection.findOne({_id: id});
    if (!file) {
      throw new Meteor.Error(404, "Not Found", 'There is no file with the id "' + id + '"');
    }
    
    file.getCollection(); // We can then call fileObj.collection
    
    // If DEL request, validate with 'remove' allow/deny, delete the file, and return
    if (self.method.toLowerCase() === "del") {
      FS.Utility.validateAction(file.collection.files._validators['remove'], file, self.userId);
      self.setStatusCode(200);
      return file.remove();
    }
    
    // If we got this far, we're doing a GET
    
    // Once we have the file, we can test allow/deny validators
    FS.Utility.validateAction(file.collection._validators['download'], file, self.userId);

    var copyInfo = file.copies[store];
    
    // If metadata=true, return just the file's metadata as JSON
    if (metadata) {
      self.setStatusCode(200);
      return copyInfo;
    }

    if (typeof copyInfo.type === "string") {
      self.setContentType(copyInfo.type);
    } else {
      self.setContentType('application/octet-stream');
    }

    // Add 'Content-Disposition' header if requested a download/attachment URL
    var start, end;
    if (typeof download !== "undefined") {
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
    // TODO support customizing headers per collection
    _.each(getHeaders, function(header) {
      self.addHeader(header[0], header[1]);
    });

    // Inform clients that we accept ranges for resumable chunked downloads
    self.addHeader('Accept-Ranges', 'bytes');
    
    return file.get({
      storeName: store,
      start: start,
      end: end
    });
  }

  // Otherwise response will be a listing
  else {
    //TODO return JSON listing that respects the correct published set
  }
}

var currentHTTPMethodNames = [];
function unmountHTTPMethods() {
  if (currentHTTPMethodNames.length) {
    var methods = {};
    _.each(currentHTTPMethodNames, function(name) {
      methods[name] = false;
    });
    HTTP.methods(methods);
    currentHTTPMethodNames = [];
  }
}

mountUrls = function mountUrls() {
  // Unmount previously mounted URLs
  unmountHTTPMethods();

  // Construct URLs
  var url1 = baseUrlForGetAndDel + '/:collectionName/:id/:filename';
  var url2 = baseUrlForGetAndDel + '/:collectionName/:id';
  var url3 = baseUrlForGetAndDel + '/:collectionName';

  // Mount URLs
  // TODO support HEAD request, possibly do it in http-methods package
  var methods = {};
  methods[url1] = {
    get: httpGetDelHandler,
    del: httpGetDelHandler
  };
  methods[url2] = {
    get: httpGetDelHandler,
    del: httpGetDelHandler
  };
  methods[url3] = {
    get: httpGetDelHandler //no support for DEL on this one
  };
  HTTP.methods(methods);

  // Cache names for potential future unmounting
  currentHTTPMethodNames.push(url1);
  currentHTTPMethodNames.push(url2);
  currentHTTPMethodNames.push(url3);
};

// Initial mount
Meteor.isServer && mountUrls();

/*
 * FS.File extensions
 */

/** 
 * @method FS.File.prototype.url Construct the file url
 * @public
 * @param {object} [options]
 * @param {string} [options.store] Name of the store to get from. If not defined,
 * the first store defined in `options.stores` for the collection is used.
 * @param {boolean} [options.auth=null] Wether or not the authenticate
 * @param {boolean} [options.download=false] Should headers be set to force a download
 * @param {boolean} [options.brokenIsFine=false] Return the URL even if
 * we know it's currently a broken link because the file hasn't been saved in
 * the requested store yet.
 *
 * Return the http url for getting the file - on server set auth if wanting to
 * use authentication on client set auth to true or token
 */
FS.File.prototype.url = function(options) {
  var self = this;
  options = options || {};
  options = _.extend({
    store: null,
    auth: null,
    download: false,
    metadata: false,
    brokenIsFine: false
  }, options.hash || options); // check for "hash" prop if called as helper

  if (self.isMounted()) {
    var filename = '';
    var storeName = options.store;

    if (storeName) {
      var copyInfo = self.getCopyInfo(storeName);
      if (!copyInfo) {
        if (options.brokenIsFine) {
          copyInfo = {};
        } else {
          // We want to return null if we know the URL will be a broken
          // link because then we can avoid rendering broken links, broken
          // images, etc.
          return null;
        }
      }

      filename = copyInfo.name;
      if (filename && filename.length) {
        filename = '/' + filename;
      } else {
        filename = '';
      }
    }

    // TODO: Could we somehow figure out if the collection requires login?
    var authToken = '';
    if (typeof Accounts !== "undefined") {
      if (options.auth !== false) {
        authToken = Accounts._storedLoginToken() || '';
      }
    } else if (typeof options.auth === "string") {
      authToken = options.auth;
    }

    // Construct query string
    var params = [];
    if (authToken !== '') {
      params.push('token=' + authToken);
    }
    if (options.download) {
      params.push('download=true');
    }
    if (storeName) {
      params.push('store=' + storeName); //TODO url escape
    }
    if (options.metadata) {
      params.push('metadata=true');
    }
    
    var queryString;
    if (params.length) {
      queryString = '?' + params.join('&');
    } else {
      queryString = '';
    }
    
    // Construct and return the http method url
    return baseUrlForGetAndDel + '/' + self.collection.name + '/' + self._id + filename + queryString;
  }

};

/*
 * DDP Stuff (TODO move this to cfs-download-ddp package)
 */


FS.AccessPoint.DDP = {};

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
  
  fileObj.getCollection(); // We can then call fileObj.collection

  FS.Utility.validateAction(fileObj.collection._validators['download'], fileObj, self.userId);

  return fileObj.get({
    storeName: storeName,
    start: start,
    end: end
  });
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

// Mount defaults for use by all collections. You may call these
// again with custom method names if you don't like the default names.
FS.AccessPoint.DDP.mountGet();