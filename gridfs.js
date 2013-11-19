var chunkSize = 262144; // 256k is default GridFS chunk size

CollectionFS.GridFSStore = function(name) {
  var chunksCollection = new Meteor.Collection(name + '.chunks', {
    _preventAutopublish: true
  });

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n
    chunksCollection._ensureIndex({files_id: 1, n: 1}, {unique: true});
  }); // EO startup

  return new StorageAdapter(name, {}, {
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
      //TODO maybe have "chunkSize" property in every chunks document
      //so that we can grab that from the first chunk rather than using
      //the global value. This would allow the global value to change.
      var first = Math.floor(start / chunkSize);
      var last = Math.floor(end / chunkSize);
      var current = first;
      var currentByte = first * chunkSize;
      var result = EJSON.newBinary(end - start);
      var chunk, data, r = 0;
      while (current <= last) {
        chunk = chunksCollection.findOne({files_id: id, n: current});
        if (!chunk || !chunk.data) {
          callback(new Error("GridFS corrupt chunk data"));
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
      }
      callback(null, result);
    },
    put: function(id, fileKey, buffer, options, callback) {
      console.log("---GridFS PUT");
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
          console.log("---GridFS PUT writing chunk " + n);
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