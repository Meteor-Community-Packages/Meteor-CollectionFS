// On the client we have just a shell
FS.Store.GridFS = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.GridFS))
    throw new Error('FS.Store.GridFS missing keyword "new"');
  
  _.extend(this, { name: name, sync: false, maxTries: 5 }, options || {});
};