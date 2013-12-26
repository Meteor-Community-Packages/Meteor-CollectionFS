// #############################################################################
//
// COLLECTION FS
//
// #############################################################################

FS.Collection = function(name, options) {
  var self = this;

  self.options = {
    useDDP: true,
    useHTTP: false,
    accessPoints: {
      DDP: accessPointsDDP(self),
      HTTP: accessPointsHTTP(self)
    },
    filter: null, //optional
    store: null, //required
    beforeSave: null, //optional
    sync: null, //optional
    maxTries: 5, //optional
    copies: {} //optional
  };

  // Extend and overwrite options
  _.extend(self.options, options);

  self.name = name;

  self.methodName = '/cfs/files/' + name;

  // On the client, we just need the httpUrl set
  if (Meteor.isClient && self.options.useHTTP) {
    self.httpUrl = self.methodName;
  }

  // When on the server we expect copies in options - otherwise we just recieve
  // the file but dont use it for anything
  if (Meteor.isServer) {
    if (!(self.options.store instanceof FS.StorageAdapter)) {
      throw new Error("You must specify a master store. Please consult the documentation.");
    }

    // #####################################################################
    //
    // Add SA observers
    // if a copy is set to sync SA changes we have to sync all other sync
    // copies SA if the change is newer than the existing and we recreate
    // the rest of the copies
    //
    // This task is added to the queue
    //
    // #####################################################################

    // Allow user to use shortcut syntax, but switch to full syntax for
    // subsequent internal use.
    if (typeof self.options.copies === "object") {
      var copyOptions;
      for (var copyName in self.options.copies) {
        copyOptions = self.options.copies[copyName];
        if (copyOptions instanceof FS.StorageAdapter) {
          self.options.copies[copyName] = {
            store: copyOptions,
            beforeSave: null,
            maxTries: self.options.maxTries
          };
        } else if (!(copyOptions.store instanceof FS.StorageAdapter)) {
          throw new Error('You must specify a store for the "' + copyName + '" copy');
        }
      }
    } else {
      self.options.copies = {};
    }

    // For internal use, we will move master store information
    // into options.copies._master
    self.options.copies._master = {
      store: self.options.store
    };
    delete self.options.store;
    if (self.options.beforeSave) {
      self.options.copies._master.beforeSave = self.options.beforeSave;
      delete self.options.beforeSave;
    }
    if (self.options.maxTries) {
      self.options.copies._master.maxTries = self.options.maxTries;
      delete self.options.maxTries;
    }
    if (self.options.sync) {
      self.options.copies._master.sync = self.options.sync;
      delete self.options.sync;
    }

    // Add DDP and HTTP access points
    if (self.options.useDDP) {
      Meteor.methods(self.options.accessPoints.DDP);
    }
    if (self.options.useHTTP) {
      if (typeof HTTP !== 'undefined' && typeof HTTP.methods === 'function') {
        self.httpUrl = self.methodName;
        Meteor.isServer && HTTP.methods(self.options.accessPoints.HTTP);
      }
    }

  } // EO is Server

  var collectionName = name + '.files';

  // Create the ".files" and use fsFile
  self.files = new Meteor.Collection(collectionName, {
    transform: function(doc) {
      var result = new FS.File(doc);
      result.collectionName = collectionName;
      return result;
    }
  });

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
    }
    if (!self.options.filter.allow.contentTypes || !_.isArray(self.options.filter.allow.contentTypes)) {
      self.options.filter.allow.contentTypes = [];
    }
    if (!self.options.filter.deny.extensions || !_.isArray(self.options.filter.deny.extensions)) {
      self.options.filter.deny.extensions = [];
    }
    if (!self.options.filter.deny.contentTypes || !_.isArray(self.options.filter.deny.contentTypes)) {
      self.options.filter.deny.contentTypes = [];
    }
  }

  // This uses collection-hooks package.
  // Prevents insertion on both client and server if filter rules say so
  self.files.before.insert(function() {
    var fsFile = this.transform();
    return fsFile.fileIsAllowed();
  });

  self.files.before.update(function() {
    // TODO will need some kind of security here
    // Don't allow them to change the type, size, name, and
    // anything else that would be security or data integrity issue.
  });

  /*
   * EO FILTER INSERTS
   */

  // Save the collection reference
  _collections[collectionName] = this;

  if (Meteor.isServer) {
    // Rig an observer on the server
    var cursor = self.files.find();
    var handle = cursor.observe({
      added: function(doc) {
        console.log('added: ' + doc._id);
      },
      changed: function(newDoc, oldDoc) {
        console.log('changed: ' + oldDoc._id);
      },
      removed: function(oldDoc) {
        console.log('remove: ' + oldDoc._id);
        //delete all copies
        _.each(self.options.copies, function(copyDefinition, copyName) {
          copyDefinition.store.remove(oldDoc, {ignoreMissing: true, copyName: copyName});
        });
      }
    });

    // Tell synchronized stores how to sync
    _.each(self.options.copies, function(copyDefinition, copyName) {
      if (copyDefinition.sync) {
        copyDefinition.store.sync({
          insert: function(storeId, info, buffer) {
            // Create a FS.File that already has info for the synchronized copy
            var fileInfo = {
              name: info.name,
              type: info.type,
              size: info.size,
              utime: info.utime,
              copies: {}
            };
            fileInfo.copies[copyName] = {
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
            selector['copies.' + copyName + '._id'] = storeId;
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
            fileInfo.copies[copyName] = {
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
            selector['copies.' + copyName + '._id'] = storeId;
            self.remove(selector);
          }
        });
      }
    });

  } // EO Server

};