// #############################################################################
//
// COLLECTION FS
//
// #############################################################################

FS.Collection = function(name, options) {
  var self = this;

  self.options = {
    useDDP: true,
    useHTTP: true,
    accessPoints: {
      DDP: null, //will set to default below
      HTTP: null //will set to default below
    },
    httpHeaders: [], //optional
    filter: null, //optional
    stores: [], //required
    chunkSize: 0.5 * 1024 * 1024 // 0.5MB; can be changed
  };

  // On the client, you may also define options.defaultStoreName to avoid
  // having to pass a store name for many functions.

  // Extend and overwrite options
  _.extend(self.options, options);

  self.name = name;
  self.methodName = '/cfs/files/' + name;
  self.httpUrl = self.options.useHTTP ? self.methodName : null;

  if (Meteor.isServer) {

    // Make at least one store has been supplied
    if (_.isEmpty(self.options.stores)) {
      throw new Error("You must specify at least one store. Please consult the documentation.");
    }

    // Add default access points if user did not supply any
    self.options.accessPoints = self.options.accessPoints || {};

    // Add DDP access points
    if (self.options.useDDP) {
      // Get the ddp accesspoint
      self.options.accessPoints.DDP = self.options.accessPoints.DDP ||
              FS.AccessPoint.DDP(self);
      // Mount the ddp methods
      Meteor.methods(self.options.accessPoints.DDP);
    }

    // Add HTTP access points
    if (self.options.useHTTP
            && typeof HTTP !== 'undefined'
            && typeof HTTP.methods === 'function') {
      // Get the http accesspoint
      self.options.accessPoints.HTTP = self.options.accessPoints.HTTP ||
              FS.AccessPoint.HTTP(self, {
                httpHeaders: self.options.httpHeaders
              });
      // Mount the http methods
      HTTP.methods(self.options.accessPoints.HTTP);
    }

  } // EO is Server

  var collectionName = name + '.files';

  var _filesOptions = {
    transform: function(doc) {
      // This should keep the filerecord in the file object updated in reactive
      // context
      var result = new FS.File(doc, true);
      result.collectionName = collectionName;
      return result;
    }
  };

  // Create the ".files" and use fsFile
  if (Package.join) {
    // We support Join if used in the app
    self.files = new Join.Collection(collectionName, _filesOptions);
  } else {
    self.files = new Meteor.Collection(collectionName, _filesOptions);
  }

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
  FS._collections[collectionName] = this;

  if (Meteor.isServer) {
    // Tell synchronized stores how to sync
    _.each(self.options.stores, function(store) {
      store.defineSyncCallbacks({
        insert: function(storeId, info, buffer) {
          // Create a FS.File that already has info for the synchronized copy
          var fileInfo = {
            name: info.name,
            type: info.type,
            size: info.size,
            utime: info.utime,
            copies: {}
          };
          fileInfo.copies[store.name] = {
            _id: storeId,
            name: info.name,
            type: info.type,
            size: info.size,
            utime: info.utime
          };
          var fsFile = new FS.File(fileInfo);

          // Load the buffer into the file object
          fsFile.setDataFromBuffer(buffer, info.type);

          // Save into the sync'd FS.Collection.
          self.insert(fsFile);
        },
        update: function(storeId, info) {
          // Get the FS.File
          var selector = {};
          selector['copies.' + store.name + '._id'] = storeId;
          var fsFile = self.findOne(selector);

          if (!fsFile)
            return;

          // Update info for this store since that is the synchronized data
          // we just received. Also, set info into the generic info since we're
          // treating this like an upload. Finally, clear out other copy info
          // so that the file worker will create new copies.
          var fileInfo = {
            name: info.name,
            type: info.type,
            size: info.size,
            utime: info.utime,
            copies: {}
          };
          fileInfo.copies[store.name] = {
            _id: storeId,
            name: info.name,
            type: info.type,
            size: info.size,
            utime: info.utime
          };
          fsFile.update({$set: fileInfo});
        },
        remove: function(storeId) {
          // TODO This will remove all copies.
          // Should we remove only the synchronized copy?
          var selector = {};
          selector['copies.' + store.name + '._id'] = storeId;
          self.remove(selector);
        }
      });
    });

    // Set up observers
    FS.FileWorker && FS.FileWorker.observe(this);

  } // EO Server

};
