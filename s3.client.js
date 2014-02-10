// On the client we have just a shell
FS.Store.S3 = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.S3))
    throw new Error('FS.Store.S3 missing keyword "new"');
  
  _.extend(this, { name: name, sync: false, maxTries: 5 }, options || {});
};