baseUrlForUploads = '/cfs/files';

FS.HTTP = FS.HTTP || {};

/**
 * @method FS.HTTP.setBaseUrlForUploads
 * @public
 * @param {String} baseUrl - Change the base URL for the HTTP upload endpoints.
 * @returns {undefined}
 */
FS.HTTP.setBaseUrlForUploads = function setBaseUrlForUploads(baseUrl) {
  
  // Adjust the baseUrl if necessary
  if (baseUrl.slice(0, 1) !== '/') {
    baseUrl = '/' + baseUrl;
  }
  if (baseUrl.slice(-1) === '/') {
    baseUrl = baseUrl.slice(0, -1);
  }
  
  // Update the base URL
  baseUrlForUploads = baseUrl;
  
  // Remount URLs with the new baseUrl, unmounting the old, on the server only
  Meteor.isServer && mountUrls();
};