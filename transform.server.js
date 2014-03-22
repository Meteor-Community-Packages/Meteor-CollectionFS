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
  self.transformRead = options.transformWrite;
};

// Allow packages to add scope
FS.Transform.scope = {
  gm: gm
};

FS.Transform.prototype.createWriteStream = function(fileObj, options) {
  var self = this;

  // Rig write stream
  var destinationStream = self.storage.createWriteStream(fileObj, options);

  if (typeof self.transformWrite === 'function') {
    // Load the configuration

    // Rig read stream for gm
    var sourceStream = new PassThrough();

    sourceStream.on('end', function() {
      sourceStream.emit('done');
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
  }

  // We dont transform just normal SA interface
  return destinationStream;
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
      // We emit an error - should we throw an error?
      sourceStream.emit('error', 'FS.Transform.createReadStream transform function failed');
    }

    // Return write stream
    return destinationStream;

  }

  // We dont transform just normal SA interface
  return sourceStream;
};
