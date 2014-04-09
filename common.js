/**
 *
 * @constructor
 * @param {string} name A name for the collection
 * @param {Object} options
 * @param {FS.StorageAdapter[]} options.stores An array of stores in which files should be saved. At least one is required.
 * @param {Object} [options.filter] Filter definitions
 * @param {Number} [options.chunkSize=2MB] Override the chunk size in bytes for uploads
 * @param {Function} [options.uploader] A function to pass FS.File instances after inserting, which will begin uploading them. By default, `FS.HTTP.uploadQueue.uploadFile` is used if the `cfs-upload-http` package is present, or `FS.DDP.uploadQueue.uploadFile` is used if the `cfs-upload-ddp` package is present. You can override with your own, or set to `null` to prevent automatic uploading.
 * @returns {undefined}
 */
FS.Collection = function(name, options) {
  var self = this;

  self.storesLookup = {};

  self.primaryStore = {};

  self.options = {
    filter: null, //optional
    stores: [], //required
    chunkSize: null
  };

  // Define a default uploader based on which upload packages are present,
  // preferring HTTP. You may override with your own function or
  // set to null to skip automatic uploading of data after file insert/update.
  if (FS.HTTP && FS.HTTP.uploadQueue) {
    self.options.uploader = FS.HTTP.uploadQueue.uploadFile;
  } else if (FS.DDP && FS.DDP.uploadQueue) {
    self.options.uploader = FS.DDP.uploadQueue.uploadFile;
  }

  // Extend and overwrite options
  FS.Utility.extend(self.options, options || {});

  // Set the FS.Collection name
  self.name = name;

  // Make sure at least one store has been supplied.
  // Usually the stores aren't used on the client, but we need them defined
  // so that we can access their names and use the first one as the default.
  if (FS.Utility.isEmpty(self.options.stores)) {
    throw new Error("You must specify at least one store. Please consult the documentation.");
  }

  FS.Utility.each(self.options.stores, function(store, i) {
    // Set the primary store
    if (i === 0) {
      self.primaryStore = store;
    }

    // Check for duplicate naming
    if (typeof self.storesLookup[store.name] !== 'undefined') {
      throw new Error('FS.Collection store names must be uniq, duplicate found: ' + store.name);
    }

    // Set the lookup
    self.storesLookup[store.name] = store;
  });

  var _filesOptions = {
    transform: function(doc) {
      // This should keep the filerecord in the file object updated in reactive
      // context
      var result = new FS.File(doc, true);
      result.collectionName = name;
      return result;
    }
  };

  // Create the 'cfs.' ++ ".filerecord" and use fsFile
  var collectionName = 'cfs.' + name + '.filerecord';
  self.files = new Meteor.Collection(collectionName, _filesOptions);

  // For storing custom allow/deny functions
  self._validators = {
    download: {allow: [], deny: []}
  };

  // Set up filters
  // XXX Should we deprecate the filter option now that this is done with a separate pkg, or just keep it?
  if (self.filters) {
    self.filters(self.options.filter);
  }

  // Save the collection reference (we want it without the 'cfs.' prefix and '.filerecord' suffix)
  FS._collections[name] = this;

  // Set up observers
  Meteor.isServer && FS.FileWorker && FS.FileWorker.observe(this);

};
