baseUrl = '/cfs';
FS.HTTP = FS.HTTP || {};

// Note the upload URL so that client uploader packages know what it is
FS.HTTP.uploadUrl = baseUrl + '/files';

/**
 * @method FS.HTTP.setBaseUrl
 * @public
 * @param {String} newBaseUrl - Change the base URL for the HTTP GET and DELETE endpoints.
 * @returns {undefined}
 */
FS.HTTP.setBaseUrl = function setBaseUrl(newBaseUrl) {

  // Adjust the baseUrl if necessary
  if (newBaseUrl.slice(0, 1) !== '/') {
    newBaseUrl = '/' + newBaseUrl;
  }
  if (newBaseUrl.slice(-1) === '/') {
    newBaseUrl = newBaseUrl.slice(0, -1);
  }

  // Update the base URL
  baseUrl = newBaseUrl;

  // Change the upload URL so that client uploader packages know what it is
  FS.HTTP.uploadUrl = baseUrl + '/files';

  // Remount URLs with the new baseUrl, unmounting the old, on the server only.
  // If existingMountPoints is empty, then we haven't run the server startup
  // code yet, so this new URL will be used at that point for the initial mount.
  if (Meteor.isServer && !FS.Utility.isEmpty(_existingMountPoints)) {
    mountUrls();
  }
};

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
  options = FS.Utility.extend({
    store: null,
    auth: null,
    download: false,
    metadata: false,
    brokenIsFine: false,
    uploading: null, // return this URL while uploading
    storing: null // return this URL while storing
  }, options.hash || options); // check for "hash" prop if called as helper

  // Primarily useful for displaying a temporary image while uploading an image
  if (options.uploading && !self.isUploaded()) {
    return options.uploading;
  }

  if (self.isMounted()) {
    // See if we've stored in the requested store yet
    var storeName = options.store || self.collection.primaryStore.name;
    if (!self.hasStored(storeName)) {
      if (options.storing) {
        return options.storing;
      } else if (!options.brokenIsFine) {
        // We want to return null if we know the URL will be a broken
        // link because then we can avoid rendering broken links, broken
        // images, etc.
        return null;
      }
    }

    // Add filename to end of URL if we can determine one
    var filename = self.name({store: storeName});
    if (typeof filename === "string" && filename.length) {
      filename = '/' + filename;
    } else {
      filename = '';
    }

    // TODO: Could we somehow figure out if the collection requires login?
    var authToken = '';
    if (typeof Accounts !== "undefined") {
      if (options.auth !== false) {
        // Add reactive deps on the user
        Meteor.userId();

        var authObject = {
          authToken: Accounts._storedLoginToken() || '',
        }

        // If it's a number, we use that as the expiration time (in seconds)
        if (options.auth === +options.auth) {
          authObject.expiration = FS.HTTP.now() + options.auth * 1000;
        }

        // Set the authToken
        var authString = JSON.stringify(authObject);
        if (typeof btoa === 'function') {
          // Client side
          authToken = btoa(authString);
        } else if (typeof Buffer !== 'undefined') {
          // Server side as atob() is not available
          authToken = Buffer(authString).toString('base64');
        } else {
          throw new Error('FS.File.url Error: Cannot base64 encode on your system');
        }
      }
    } else if (typeof options.auth === "string") {
      // If the user supplies auth token the user will be responsible for
      // updating
      authToken = options.auth;
    }

    // Construct query string
    var params = {};
    if (authToken !== '') {
      params.token = authToken;
    }
    if (options.download) {
      params.download = true;
    }
    if (options.store) {
      // We use options.store here instead of storeName because we want to omit the queryString
      // whenever possible, allowing users to have "clean" URLs if they want. The server will
      // assume the first store defined on the server, which means that we are assuming that
      // the first on the client is also the first on the server. If that's not the case, the
      // store option should be supplied.
      params.store = options.store;
    }
    var queryString = FS.Utility.encodeParams(params);
    if (queryString.length) {
      queryString = '?' + queryString;
    }

    // Determine which URL to use
    var area;
    if (options.metadata) {
      area = '/record';
    } else {
      area = '/files';
    }

    // Construct and return the http method url
    return baseUrl + area + '/' + self.collection.name + '/' + self._id + filename + queryString;
  }

};


