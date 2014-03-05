// #############################################################################
//
// COLLECTION FS
//
// #############################################################################

/**
 *
 * @constructor
 * @param {string} name A name for the collection
 * @param {Object} options
 * @param {FS.StorageAdapter[]} options.stores An array of stores in which files should be saved. At least one is required.
 * @param {Object} [options.filter] Filter definitions
 * @param {Number} [options.chunkSize=131072] Override the chunk size in bytes for uploads and downloads
 * @param {Function} [options.uploader] A function to pass FS.File instances after inserting, which will begin uploading them. By default, `FS.HTTP.uploadQueue.uploadFile` is used if the `cfs-upload-http` package is present, or `FS.DDP.uploadQueue.uploadFile` is used if the `cfs-upload-ddp` package is present. You can override with your own, or set to `null` to prevent automatic uploading.
 * @returns {undefined}
 */
FS.Collection = function(name, options) {
  var self = this;

  self.options = {
    filter: null, //optional
    stores: [], //required
    chunkSize: 128 * 1024 // 128K default; higher begins to produce UI blocking
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
  _.extend(self.options, options || {});

  self.name = name;

  // Make sure at least one store has been supplied.
  // Usually the stores aren't used on the client, but we need them defined
  // so that we can access their names and use the first one as the default.
  if (_.isEmpty(self.options.stores)) {
    throw new Error("You must specify at least one store. Please consult the documentation.");
  }

  var _filesOptions = {
    transform: function(doc) {
      // This should keep the filerecord in the file object updated in reactive
      // context
      var result = new FS.File(doc, true);
      result.collectionName = name;
      return result;
    }
  };

  // Create the '_cfs.' ++ ".filerecord" and use fsFile
  var collectionName = '_cfs.' + name + '.filerecord';
  self.files = new Meteor.Collection(collectionName, _filesOptions);

  // For storing custom allow/deny functions
  self._validators = {
    download: {allow: [], deny: []}
  };

  /*
   * FILTER INSERTS
   */

  // Normalize filter option values for quicker checking later
  // TODO I think we have to throw an error if security options dont comply with
  // the api - in case of mismatch the user should correct this, if not the
  // result will be less secure?
  if (self.options.filter) {
    if (!self.options.filter.allow || !Match.test(self.options.filter.allow, Object)) {
      self.options.filter.allow = {};
    }
    if (!self.options.filter.deny || !Match.test(self.options.filter.deny, Object)) {
      self.options.filter.deny = {};
    }
    if (!self.options.filter.maxSize || typeof self.options.filter.maxSize !== "number") {
      self.options.filter.maxSize = null;
    }
    if (!self.options.filter.allow.extensions || !_.isArray(self.options.filter.allow.extensions)) {
      self.options.filter.allow.extensions = [];
    } else {
      //convert all to lowercase
      for (var i = 0, ln = self.options.filter.allow.extensions.length; i < ln; i++) {
        self.options.filter.allow.extensions[i] = self.options.filter.allow.extensions[i].toLowerCase();
      }
    }
    if (!self.options.filter.allow.contentTypes || !_.isArray(self.options.filter.allow.contentTypes)) {
      self.options.filter.allow.contentTypes = [];
    }
    if (!self.options.filter.deny.extensions || !_.isArray(self.options.filter.deny.extensions)) {
      self.options.filter.deny.extensions = [];
    } else {
      //convert all to lowercase
      for (var i = 0, ln = self.options.filter.deny.extensions.length; i < ln; i++) {
        self.options.filter.deny.extensions[i] = self.options.filter.deny.extensions[i].toLowerCase();
      }
    }
    if (!self.options.filter.deny.contentTypes || !_.isArray(self.options.filter.deny.contentTypes)) {
      self.options.filter.deny.contentTypes = [];
    }
  }

  // Define deny functions to enforce file filters on the server
  // for inserts and updates that initiate from untrusted code.
  self.files.deny({
    insert: function(userId, fsFile) {
      return !fsFile.fileIsAllowed();
    },
    update: function(userId, fsFile, fields, modifier) {
      // TODO will need some kind of additional security here:
      // Don't allow them to change the type, size, name, and
      // anything else that would be security or data integrity issue.
      return !fsFile.fileIsAllowed();
    },
    fetch: []
  });

  // If insecure package is in use, we need to add allow rules that return
  // true. Otherwise, it would seemingly turn off insecure mode.
  if (Package && Package.insecure) {
    self.allow({
      insert: function() {
        return true;
      },
      update: function() {
        return true;
      },
      remove: function() {
        return true;
      },
      download: function() {
        return true;
      },
      fetch: [],
      transform: null
    });
  }
  // If insecure package is NOT in use, then adding the deny function
  // does not have any effect on the main app's security paradigm. The
  // user will still be required to add at least one allow function of her
  // own for each operation for this collection. And the user may still add
  // additional deny functions, but does not have to.

  /*
   * EO FILTER INSERTS
   */

  // Save the collection reference
  FS._collections[name] = this;

  // Set up observers
  Meteor.isServer && FS.FileWorker && FS.FileWorker.observe(this);

};
