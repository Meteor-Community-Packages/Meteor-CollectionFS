var path = Npm.require('path');
var mongodb = Npm.require('mongodb');
var Grid = Npm.require('gridfs-stream');
//var Grid = Npm.require('gridfs-locking-stream');

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

  if (options.chunkSize) {
    chunkSize = options.chunkSize;
  }

  return new FS.StorageAdapter(name, options, {

    typeName: 'storage.gridfs',
    fileKey: function(fileObj) {
      // We could have this return an object with _id and name
      // since the stream-lock only allows createStream from id
      // The TempStore should track uploads by id too - at the moment
      // TempStore only sets name, _id, collectionName for us to generate the
      // id from.
      return fileObj.collectionName + fileObj._id;
    },
    createReadStream: function(fileKey, options) {
      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      return gfs.createReadStream({
        filename: fileKey,
        root: gridfsName,
      });

    },
    createWriteStream: function(fileKey, options) {
      options = options || {};

      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      var writeStream = gfs.createWriteStream({
        filename: fileKey,
        mode: 'w',
        root: gridfsName,
        chunk_size: options.chunk_size || chunkSize,
        // We allow aliases, metadata and contentType to be passed in via
        // options
        aliases: options.aliases || [],
        metadata: options.metadata || null,
        content_type: options.contentType || 'application/octet-stream'
      });

      writeStream.on('close', function(file) {
        if (FS.debug) console.log('SA GridFS - DONE!');
        // Emit end and return the fileKey, size, and updated date
        writeStream.emit('stored', {
          fileKey: file._id,
          size: file.length,
          storedAt: file.uploadDate || new Date()
        });
      });

      return writeStream;

    },
    remove: function(fileKey, callback) {
      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      try {
        gfs.remove({ _id: fileKey, root: gridfsName }, callback);
      } catch(err) {
        callback(err);
      }
    },

    // Not implemented
    watch: function() {
      throw new Error("GridFS storage adapter does not support the sync option");
    },

    init: function(callback) {
      mongodb.MongoClient.connect(options.mongoUrl, mongoOptions, function (err, db) {
        if (err) { return callback(err); }
        self.db = db;

        console.log('GridFS init ' + name + ' on ' + options.mongoUrl);

        callback(null);
      });
    }
  });
};
