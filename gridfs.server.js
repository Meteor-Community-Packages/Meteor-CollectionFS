var path = Npm.require('path');
var mongodb = Npm.require('mongodb');
var chunkSize = 262144; // 256k is default GridFS chunk size

/**
 * @public
 * @constructor
 * @param {String} name - The store name
 * @param {Object} options
 * @param {Function} [options.beforeSave] - Function to run before saving a file from the server. The context of the function will be the `FS.File` instance we're saving. The function may alter its properties.
 * @param {Number} [options.maxTries=5] - Max times to attempt saving a file
 * @returns {FS.StorageAdapter} An instance of FS.StorageAdapter.
 *
 * Creates a GridFS store instance on the server. Inherits from FS.StorageAdapter
 * type.
 */
FS.Store.GridFS = function(name, options) {
  var self = this;
  options = options || {};

  if (!(self instanceof FS.Store.GridFS))
    throw new Error('FS.Store.GridFS missing keyword "new"');

  if (!options.mongoUrl) {
    options.mongoUrl = process.env.MONGO_URL;
  }

  return new FS.StorageAdapter(name, options, {

    typeName: 'storage.gridfs',

    get: function(fileObj, callback) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, null); }
      var fileKey = fileInfo.key;

      mongodb.GridStore.exist(self.db, fileKey, name, {}, function (err, existing) {
        if (err) { return callback(err); }
        if (!existing) { return callback(null, null); }
        var gstore = new mongodb.GridStore(self.db, fileKey, 'r', { root: name });
        gstore.open(function (err, gs) {
          if (err) { return callback(err); }
          gs.read(function (err, result) {
            if (err) { return callback(err); }
            gs.close(function (err) {
              if (err) { return callback(err); }
              callback(null, result);
            });
          });
        });
      });
      // var existing = Meteor._wrapAsync(mongodb.GridStore.exist)(self.db, fileKey, name, {});
      // if (!existing) { return callback(null, null); }
      // var gs = new mongodb.GridStore(self.db, fileKey, 'r', { root: name });
      // gs = Meteor._wrapAsync(gs.open.bind(gs))();
      // var result = Meteor._wrapAsync(gs.read.bind(gs))();
      // Meteor._wrapAsync(gs.close.bind(gs))();
      // callback(null, new Uint8Array(result));
    },

    getBytes: function(fileObj, start, end, callback) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, null); }
      var fileKey = fileInfo.key;
      mongodb.GridStore.exist(self.db, fileKey, name, {}, function (err, existing) {
        if (err) { return callback(err); }
        if (!existing) { return callback(null, null); }
        var gstore = new mongodb.GridStore(self.db, fileKey, 'r', { root: name });
        gstore.open(function (err, gs) {
          if (err) { return callback(err); }
          gs.seek(start, function (err) {
            if (err) { return callback(err); }
            gs.read(end - start, function (err, result) {
              if (err) { return callback(err); }
              gs.close(function (err) {
                if (err) { return callback(err); }
                callback(null, result);
              });
            });
          });
        });
      });
      // var existing = Meteor._wrapAsync(mongodb.GridStore.exist)(self.db, fileKey, name, {});
      // if (!existing) { return callback(null, null); }
      // var gs = new mongodb.GridStore(self.db, fileKey, 'r', { root: name });
      // gs = Meteor._wrapAsync(gs.open.bind(gs))();
      // Meteor._wrapAsync(gs.seek.bind(gs))(start);
      // var result = Meteor._wrapAsync(gs.read.bind(gs))(end - start);
      // Meteor._wrapAsync(gs.close.bind(gs))();
      // callback(null, new Uint8Array(result));
    },

    put: function(fileObj, options, callback) {
      var self = this;
      options = options || {};

      var fileKey = fileObj.collectionName + fileObj._id;
      var buffer = fileObj.getBuffer();

      // Write buffer to store once we have a suitable fileKey
      var writeBuffer = function (goodFileKey) {
        var gridOptions = {
          root: name,
          chunk_size: options.chunk_size || chunkSize,
          metadata: fileObj.metadata || null,
          content_type: fileObj.type || 'application/octet-stream'
        };
        var gstore = new mongodb.GridStore(self.db, goodFileKey, 'w', gridOptions);
        gstore.open(function (err, gs) {
          if (err) { return callback(err); }
          gs.write(buffer, function (err, result) {
            if (err) { return callback(err); }
            gs.close(function (err) {
              if (err) { return callback(err); }
              callback(null, goodFileKey);
            });
          });
        });
      };

      if (options.overwrite) {
        writeBuffer(fileKey);
      } else {
        var fn = fileKey;
        var suffix = 0;
        // XXX: Icky recursive async call to find non-existing fileKey
        var findGoodFileKey = function (err, existing) {
          if (err) { return callback(err); }
          if (existing) {
            suffix++;
            fileKey = fn + '_' + suffix;
            mongodb.GridStore.exist(self.db, fileKey, name, {}, findGoodFileKey);
          } else {
            writeBuffer(fileKey);
          }
        };
        mongodb.GridStore.exist(self.db, fileKey, name, {}, findGoodFileKey);
      }

      // var existing = Meteor._wrapAsync(mongodb.GridStore.exist)(self.db, fileKey, name, {});
      // if (existing && !options.overwrite) {
      //   // Alter the recommended fileKey until we have one that is unique
      //   var fn = fileKey;
      //   var suffix = 0;
      //   do {
      //     suffix++;
      //     fileKey = fn + '_' + suffix; //once we exit the loop, this is what will actually be used
      //   } while (Meteor._wrapAsync(mongodb.GridStore.exist)(self.db, fileKey, name, {}));
      // }
      // var gs = new mongodb.GridStore(self.db, fileKey, 'w', gridOptions);
      // gs = Meteor._wrapAsync(gs.open.bind(gs))();
      // var result = Meteor._wrapAsync(gs.write.bind(gs))(buffer);
      // Meteor._wrapAsync(gs.close.bind(gs))();
      // callback(null, fileKey);
    },

    del: function(fileObj, callback) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, true); }
      var fileKey = fileInfo.key;
      mongodb.GridStore.unlink(self.db, fileKey, { root: name }, function (err) {
        if (err) { return callback(err); }
        callback(null, true);
      });
      // Meteor._wrapAsync(mongodb.GridStore.unlink)(self.db, fileKey, { root: name });
      // callback(null, true);
    },

    watch: function() {
      throw new Error("GridFS storage adapter does not support the sync option");
    },

    init: function(callback) {
      var self = this;
      if (callback) {
        mongodb.MongoClient.connect(options.mongoUrl, function (err, db) {
          if (err) { return callback(err); }
          self.db = db;
          callback(null);
        });
      } else {  // XXX: remove once callback is implemented
        self.db = Meteor._wrapAsync(mongodb.MongoClient.connect)(options.mongoUrl);
      }
    }
  });
};
