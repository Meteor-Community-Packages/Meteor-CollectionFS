/**
 * @namespace FS
 * @constructor
 * @param {type} name
 * @param {type} options
 * @returns {undefined}
 * 
 * Creates an S3 store instance on the client, which is just a shell object
 * storing some info.
 */
FS.Store.S3 = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.S3))
    throw new Error('FS.Store.S3 missing keyword "new"');
  
  _.extend(this, { name: name, sync: false, maxTries: 5 }, options || {});
};