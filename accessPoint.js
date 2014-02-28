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