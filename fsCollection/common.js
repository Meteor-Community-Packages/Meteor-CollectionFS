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
    filter: null, //optional
    store: null, //required
    beforeSave: null, //optional
    sync: null, //optional
    maxTries: 5, //optional
    copies: null //optional
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
    }
    if (self.options.useDDP) {
      // Add ddp mount point + /get /put
      Meteor.methods(accessPointDDP(self.methodName));
    }
    if (self.options.useHTTP) {
      // Add http mount point
      // Provide the upload and download server methods
      if (typeof HTTP !== 'undefined' && typeof HTTP.methods === 'function') {
        // Set httpUrl
        self.httpUrl = self.methodName;
        Meteor.isServer && HTTP.methods(accessPointHTTP(self));
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
        //delete master
        self.options.store.remove(oldDoc, {ignoreMissing: true, copyName: null});
        //delete all copies
        _.each(self.options.copies, function(copyDefinition, copyName) {
          copyDefinition.store.remove(oldDoc, {ignoreMissing: true, copyName: copyName});
        });
      }
    });

    // Tell master storage adapter how to sync
    if (self.options.sync) {
      self.options.store.sync({
        insert: function(storeId, info, buffer) {
          // Create a FS.File that already has info for the master copy
          var fsFile = new FS.File({
            name: info.name,
            type: info.type,
            size: info.size,
            utime: info.utime,
            master: {
              _id: storeId,
              name: info.name,
              type: info.type,
              size: info.size,
              utime: info.utime
            }
          });

          // Load the master buffer into the file object
          fsFile.setDataFromBuffer(buffer, info.type);

          // Save into the sync'd FS.Collection.
          self.insert(fsFile);
        },
        update: function(storeId, info) {
          // Get the FS.File
          var fsFile = self.findOne({'master._id': storeId});

          // Update info for the master store since that is the synchronized data
          // we just received. Also, set info into the generic info since we're
          // treating this like an upload. Finally, clear out other copy info
          // so that the file worker will create new copies.
          fsFile.update({$set: {
              name: info.name,
              type: info.type,
              size: info.size,
              utime: info.utime,
              'master.name': info.name,
              'master.type': info.type,
              'master.size': info.size,
              'master.utime': info.utime
            }, $unset: {copies: ''}});
        },
        remove: function(storeId) {
          //TODO possibly should just remove this copy?
          self.remove({'master._id': storeId});
        }
      });
    }
  } // EO Server

};