// On the client we have just a shell
FS.Store.FileSystem = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.FileSystem))
    throw new Error('FS.Store.FileSystem missing keyword "new"');
  
  _.extend(this, { name: name, sync: false, maxTries: 5 }, options || {});
};