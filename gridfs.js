var chunkSize = 262144; // 256k is default GridFS chunk size

FS.Store.GridFS = function(name, options) {
  var chunksCollection = new Meteor.Collection(name + '.chunks', {
    _preventAutopublish: true
  });

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n
    chunksCollection._ensureIndex({files_id: 1, n: 1}, {unique: true});
  }); // EO startup

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.gridfs',
    get: function(id, callback) {
      // Find chunks in the CFS for this file
      var query = chunksCollection.find({files_id: id}, {sort: {n: 1}});

      var dataArray = [], data, fileSize = 0;
      query.forEach(function(chunk) {
        data = chunk.data;
        if (!data) {
          callback(new Error('GridFS: no data in chunk ' + chunk.n + ' of file with _id ' + id));
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
    getBytes: function(id, start, end, callback) {
      // Find out what chunk size we saved with, which we stored
      // with chunk 0 when we saved it
      var chunk = chunksCollection.findOne({files_id: id, n: 0});
      var savedChunkSize = chunk.chunkSize || chunkSize;
      var first = Math.floor(start / savedChunkSize);
      var last = Math.floor(end / savedChunkSize);
      var current = first;
      var currentByte = first * savedChunkSize;
      var result = EJSON.newBinary(end - start);
      var data, r = 0;
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
    put: function(id, fileKey, buffer, options, callback) {
      FS.debug && console.log("---GridFS PUT");
      options = options || {};
      
      // Because we are keying off id, it should be fine to ignore
      // the options.overwrite value. But either way, we need
      // to ensure that any old data for this ID is removed.
      chunksCollection.remove({files_id: id});

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
          var chunkDoc = {
            files_id: id, // _id of the corresponding files collection entry
            n: n,
            data: chunk
          };
          if (n === 0) {
            // Store the desired, not actual, chunk size with chunk 0, for later reference
            chunkDoc.chunkSize = chunkSize;
          }
          // Save data chunk into database
          var chunkId = chunksCollection.insert(chunkDoc);
          if (!chunkId) {
            callback(new Error("GridFS failed to save chunk " + n + " for file " + id));
            return;
          }
          newChunk = true;
          n++;
        }
      }

      callback(null, id);
    },
    del: function(id, callback) {
      chunksCollection.remove({files_id: id}, callback);
    },
    watch: function() {
      throw new Error("GridFS storage adapter does not support the sync option");
    },
    init: function() {
    }
  });
};