var PassThrough = Npm.require('stream').PassThrough;

// XXX: Add some kind of check to see if GM is actually installed on the system
var gm = Npm.require('gm');

// XXX: This could be in a seperate package? if needed.

FS.Transform = function(options) {
  var self = this;

  options = options || {};

  if (!(self instanceof FS.Transform))
    throw new Error('FS.Transform must be called with the "new" keyword');

  if (!options.store)
    throw new Error('Transform expects option.store to be a storage adapter');

  // Support both Storage adapter and internal SA api
  self.storage = (options.store.adapter)?options.store.adapter: options.store;

  // Fetch the transformation functions if any
  self.transformWrite = options.transformWrite;
  self.transformRead = options.transformRead;
};

// Allow packages to add scope
FS.Transform.scope = {
  gm: gm
};

// The transformation stream triggers an "stored" event when data is stored into
// the storage adapter
FS.Transform.prototype.createWriteStream = function(fileObj, options) {
  var self = this;

  // Rig write stream
  var destinationStream = self.storage.createWriteStream(fileObj, options);

  if (typeof self.transformWrite === 'function') {

    // Rig read stream for gm
    var sourceStream = new PassThrough();

    // We trigger a special "stored" event for those listening
    destinationStream.on('end', function() {
      sourceStream.emit('stored');
    });

    // Rig transform
    try {
      self.transformWrite.call(FS.Transform.scope, fileObj, sourceStream, destinationStream);
    } catch(err) {
      // We emit an error - should we throw an error?
      sourceStream.emit('error', 'FS.Transform.createWriteStream transform function failed');
    }

    // Return write stream
    return sourceStream;
  } else {

    // We trigger a special "stored" event for those listening
    destinationStream.on('end', function() {
      destinationStream.emit('stored');
    });

    // We dont transform just normal SA interface
    return destinationStream;
  }

};

FS.Transform.prototype.createReadStream = function(fileObj, options) {
  var self = this;

  // Rig read stream
  var sourceStream = self.storage.createReadStream(fileObj, options);

  if (typeof self.transformRead === 'function') {
    // Rig write stream
    var destinationStream = new PassThrough();

    // Rig transform
    try {
      self.transformRead.call(FS.Transform.scope, fileObj, sourceStream, destinationStream);
    } catch(err) {
      //throw new Error(err);
      // We emit an error - should we throw an error?
      sourceStream.emit('error', 'FS.Transform.createReadStream transform function failed');
    }

    // Return write stream
    return destinationStream;

  }

  // We dont transform just normal SA interface
  return sourceStream;
};
