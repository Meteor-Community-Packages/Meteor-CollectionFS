var path = Npm.require('path');
var mongodb = Npm.require('mongodb');
var Grid = Npm.require('gridfs-stream');

var chunkSize = 1024*1024*2; // 256k is default GridFS chunk size, but performs terribly for largish files

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

  var gridfsName = name;
  var mongoOptions = options.mongoOptions || {};

  if (!(self instanceof FS.Store.GridFS))
    throw new Error('FS.Store.GridFS missing keyword "new"');

  if (!options.mongoUrl) {
    options.mongoUrl = process.env.MONGO_URL;
    // When using a Meteor MongoDB instance, preface name with "cfs_gridfs."
    gridfsName = "cfs_gridfs." + name;
  }

  if (!options.mongoOptions) {
    options.mongoOptions = { db: { native_parser: true }, server: { auto_reconnect: true }};
  }

  return new FS.StorageAdapter(name, options, {

    typeName: 'storage.gridfs',
    createReadStream: function(fileObj, options) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) {
        return new Error('File not found on this store "' + name + '"');
      }

      var fileKey = fileInfo.key;

      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      return gfs.createReadStream({
        filename: fileKey,
        root: gridfsName,
      });

    },
    createWriteStream: function(fileObj, options) {
      var self = this;
      options = options || {};

      var fileKey = fileObj.collectionName + fileObj._id;

      // XXX: support overwrite?

      // Update the fileObj - we dont save it to the db but sets the fileKey
      fileObj.copies[name].key = fileKey;

      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      var writeStream = gfs.createWriteStream({
        filename: fileKey,
        mode: 'w',
        root: gridfsName,
        chunk_size: options.chunk_size || chunkSize,
        metadata: fileObj.metadata || null,
        content_type: fileObj.type || 'application/octet-stream'
      });

      return writeStream;

    },
    get: function(fileObj, callback) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, null); }
      var fileKey = fileInfo.key;

      mongodb.GridStore.exist(self.db, fileKey, gridfsName, {}, function (err, existing) {
        if (err) { return callback(err); }
        if (!existing) { return callback(null, null); }
        var gstore = new mongodb.GridStore(self.db, fileKey, 'r', { root: gridfsName });
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
    },

    getBytes: function(fileObj, start, end, callback) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, null); }
      var fileKey = fileInfo.key;
      mongodb.GridStore.exist(self.db, fileKey, gridfsName, {}, function (err, existing) {
        if (err) { return callback(err); }
        if (!existing) { return callback(null, null); }
        var gstore = new mongodb.GridStore(self.db, fileKey, 'r', { root: gridfsName });
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
    },

    put: function(fileObj, options, callback) {
      var self = this;
      options = options || {};

      var fileKey = fileObj.collectionName + fileObj._id;
      var buffer = fileObj.getBuffer();

      // Write buffer to store once we have a suitable fileKey
      var writeBuffer = function (newFileKey) {
        var gridOptions = {
          root: gridfsName,
          chunk_size: options.chunk_size || chunkSize,
          metadata: fileObj.metadata || null,
          content_type: fileObj.type || 'application/octet-stream'
        };
        var gstore = new mongodb.GridStore(self.db, newFileKey, 'w', gridOptions);
        gstore.open(function (err, gs) {
          if (err) { return callback(err); }
          gs.write(buffer, function (err, result) {
            if (err) { return callback(err); }
            gs.close(function (err) {
              if (err) { return callback(err); }
              callback(null, newFileKey);
            });
          });
        });
      };

      if (options.overwrite) {
        writeBuffer(fileKey);
      } else {
        var fn = fileKey;
        var findUnusedFileKey = function (err, existing) {
          if (err) { return callback(err); }
          if (existing) {
            // Avoid deep recursion by appending a 6-digit base 36 pseudorandom number
            fileKey = fn + '_' + Math.floor(Math.random() * 2176782335).toString(36);
            mongodb.GridStore.exist(self.db, fileKey, gridfsName, {}, findUnusedFileKey);
          } else {
            writeBuffer(fileKey);
          }
        };
        mongodb.GridStore.exist(self.db, fileKey, gridfsName, {}, findUnusedFileKey);
      }
    },

    del: function(fileObj, callback) {
      var self = this;
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, true); }
      var fileKey = fileInfo.key;
      mongodb.GridStore.unlink(self.db, fileKey, { root: gridfsName }, function (err) {
        if (err) { return callback(err); }
        callback(null, true);
      });
    },

    watch: function() {
      throw new Error("GridFS storage adapter does not support the sync option");
    },

    init: function(callback) {
      var self = this;

      mongodb.MongoClient.connect(options.mongoUrl, mongoOptions, function (err, db) {
        if (err) { return callback(err); }
        self.db = db;

        console.log('GridFS init ' + name + ' on ' + options.mongoUrl);

        callback(null);
      });
    }
  });
};
