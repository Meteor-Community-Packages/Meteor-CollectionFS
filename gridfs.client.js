/**
 * @public
 * @constructor
 * @param {String} name - The store name
 * @param {Object} options
 * @param {Function} [options.beforeSave] - Function to run before saving a file from the client. The context of the function will be the `FS.File` instance we're saving. The function may alter its properties.
 * @param {Number} [options.maxTries=5] - Max times to attempt saving a file
 * @returns {undefined}
 *
 * Creates a GridFS store instance on the client, which is just a shell object
 * storing some info.
 */
FS.Store.GridFS = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.GridFS))
    throw new Error('FS.Store.GridFS missing keyword "new"');

  FS.Utility.extend(this, { name: name, sync: false, maxTries: 5 }, options || {});
};
