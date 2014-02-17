var path = Npm.require('path');
var chunkSize = 262144; // 256k is default GridFS chunk size

FS.Store.GridFS = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.GridFS))
    throw new Error('FS.Store.GridFS missing keyword "new"');
  
  // Init collections
  var filesCollection = new Meteor.Collection('fs.' + name + '.files', {
    _preventAutopublish: true
  });
  
  var chunksCollection = new Meteor.Collection('fs.' + name + '.chunks', {
    _preventAutopublish: true
  });

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n
    chunksCollection._ensureIndex({files_id: 1, n: 1}, {unique: true});
  }); // EO startup

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.gridfs',
    get: function(fileKey, callback) {
      var file = filesCollection.findOne({filename: fileKey});
      // Find chunks in the CFS for this file
      var query = chunksCollection.find({files_id: file._id}, {sort: {n: 1}});

      var dataArray = [], data, fileSize = 0;
      query.forEach(function(chunk) {
        data = chunk.data;
        if (!data) {
          callback(new Error('GridFS: no data in chunk ' + chunk.n + ' of file with key ' + fileKey));
          return;
        }
        dataArray.push(data);
        fileSize += data.length;
      });

      // Allocate memory for binary data
      var result = EJSON.newBinary(fileSize);

      // Fill result from data chunks
      var r = 0;
      for (var i = 0, ln = dataArray.length; i < ln; i++) {
        data = dataArray[i];
        for (var a = 0, dl = data.length; a < dl; a++) {
          result[r] = data[a];
          r++;
        }
      }
      callback(null, result);
    },
    getBytes: function(fileKey, start, end, callback) {
      // Find out what chunk size we saved with, which we stored
      // with chunk 0 when we saved it
      var file = filesCollection.findOne({filename: fileKey});
      var savedChunkSize = file.chunkSize || chunkSize;
      var first = Math.floor(start / savedChunkSize);
      var last = Math.floor(end / savedChunkSize);
      var current = first;
      var currentByte = first * savedChunkSize;
      var result = EJSON.newBinary(end - start);
      var chunk, data, r = 0, id = file._id;
      while (current <= last) {
        chunk = chunksCollection.findOne({files_id: id, n: current});
        if (!chunk || !chunk.data) {
          callback(new Error("GridFS corrupt chunk data for chunk " + current));
          return;
        }
        data = chunk.data;
        for (var i = 0, ln = data.length; i < ln; i++) {
          if (currentByte >= start) {
            result[r] = data[i];
            r++;
          }
          currentByte++;
          if (currentByte === end) {
            break;
          }
        }
        current++;
      }
      callback(null, result);
    },
    put: function(fileKey, buffer, options, callback) {
      FS.debug && console.log("---GridFS PUT");
      options = options || {};
      
      var existing = filesCollection.findOne({filename: fileKey});
      if (existing) {
        if (options.overwrite) {
          filesCollection.remove({_id: existing._id});
          chunksCollection.remove({files_id: existing._id});
        } else {
          // Alter the recommended fileKey until we have one that is unique
          var extension = path.extname(fileKey);
          var fn = fileKey.substr(0, fileKey.length - extension.length);
          var suffix = 0;
          do {
            suffix++;
            fileKey = fn + suffix + extension; //once we exit the loop, this is what will actually be used
          } while (filesCollection.findOne({filename: fileKey}));
        }
      }

      var id = filesCollection.insert({
        size: buffer.length, //use size instead of length because of Meteor issues
        chunkSize: chunkSize,
        uploadDate: new Date,
        md5: null, //not currently implemented
        filename: fileKey, //we key off this for future PUT/GET/DEL
        contentType: options.type,
        aliases: [],
        metadata: {}
      });

      var chunk, size, cPos, n = 0, newChunk = true;
      for (var i = 0, ln = buffer.length; i < ln; i++) {
        if (newChunk) {
          size = Math.min(chunkSize, ln - i);
          chunk = EJSON.newBinary(size);
          cPos = 0;
          newChunk = false;
        }
        chunk[cPos] = buffer[i];
        cPos++;

        if (cPos === size) {
          FS.debug && console.log("---GridFS PUT writing chunk " + n);
          // Save data chunk into database
          var chunkId = chunksCollection.insert({
            files_id: id, // _id of the corresponding files collection entry
            n: n,
            data: chunk
          });
          if (!chunkId) {
            callback(new Error("GridFS failed to save chunk " + n + " for file " + id));
            return;
          }
          newChunk = true;
          n++;
        }
      }

      callback(null, fileKey);
    },
    del: function(fileKey, callback) {
      var file = filesCollection.findOne({filename: fileKey});
      chunksCollection.remove({files_id: file._id}, function (err) {
        if (err) {
          callback(err);
        } else {
          filesCollection.remove({_id: file._id}, callback);
        }
      });
    },
    watch: function() {
      throw new Error("GridFS storage adapter does not support the sync option");
    },
    init: function() {
    }
  });
};