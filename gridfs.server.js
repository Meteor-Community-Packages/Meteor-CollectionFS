var path = Npm.require('path');
var mongodb = Npm.require('mongodb');
var ObjectID = Npm.require('mongodb').ObjectID;
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

      // XXX: We should not have to mount the file here - We assume its taken
      // care of - Otherwise we create new files instead of overwriting
      var store = fileObj && fileObj.copies && fileObj.copies[name];

      return {
        // XXX: We currently allow the TempStore to pass in a mongoId directly
        // Get the key or create a new
        _id: fileObj.mongoId || store && store.key,
        //_id: store && store.key,
        // Pass on filename or create a filename
        filename: fileObj.name || (fileObj.collectionName + '-' +fileObj._id),
      };

    },
    createReadStream: function(fileKey, options) {
      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      return gfs.createReadStream({
        _id: new ObjectID(fileKey._id),
        //filename: fileKey.filename,
        root: gridfsName,
      });

    },
    createWriteStream: function(fileKey, options) {
      options = options || {};

      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      var writeStream = gfs.createWriteStream({
        _id: new ObjectID(fileKey._id),
        filename: fileKey.filename,
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
          // Set the generated _id so that we know it for future reads and writes.
          // We store the _id as a string and only convert to ObjectID right before
          // reading, writing, or deleting. If we store the ObjectID itself,
          // Meteor (EJSON?) seems to convert it to a LocalCollection.ObjectID,
          // which GFS doesn't understand.
          fileKey: file._id.toString(),
          size: file.length,
          storedAt: file.uploadDate || new Date()
        });
      });

      writeStream.on('error', function(error) {
        if (FS.debug) console.log('SA GridFS - ERROR!', error);
      });

      return writeStream;

    },
    remove: function(fileKey, callback) {
      // Init GridFS
      var gfs = new Grid(self.db, mongodb);

      try {
        gfs.remove({ _id: new ObjectID(fileKey._id), root: gridfsName }, callback);
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
