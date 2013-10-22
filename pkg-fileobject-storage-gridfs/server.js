/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 *
 * By Morten N.O. Henriksen, http://gi2.dk
 *
 */
"use strict";

// @export CollectionFS
CollectionFS = function(name) {
  var self = this;
  self._name = name || "fs";

  //create collections
  self.files = new Meteor.Collection(self._name + '.files', {
    transform: function(doc) {
      // Map transformation client api
      var fo = new FileObject(doc);
      fo.collection = self;
      return fo;
    }
  });
  self.chunks = new Meteor.Collection(self._name + '.chunks', {
    _preventAutopublish: true
  });

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n
    self.chunks._ensureIndex({files_id: 1, n: 1}, {unique: true});
  });

}; //EO collectionFS

CollectionFS.prototype.insert = function(fileObject) {
  var self = this, buffer = fileObject.buffer;

  if (!fileObject.buffer)
    throw new Error("cannot insert FileObject into a CollectionFS unless its buffer is set");

  var fileId = self.files.insert(fileObject.filesDocument());

  // Check that we are ok
  if (!fileId)
    throw new Error('could not insert "' + fileObject.filename + '" in ' + self._name + ' collection');

  var length = fileObject.buffer.length,
          size = fileObject.chunkSize,
          totalChunks = fileObject.expectedChunks();

  for (var n = 0; n < totalChunks; n++) {
    // Handle each chunk
    var start = n * size, end = start + size;
    end = Math.min(end, length);
    var bytes = end - start;
    var data = new Uint8Array(end - start);
    for (var i = 0; i < bytes; ++i) {
      data[i] = buffer[start + i];
    }

    // Save data chunk into database
    var cId = self.chunks.insert({
      "files_id": fileId, // _id of the corresponding files collection entry
      "n": n, // chunks are numbered in order, starting with 0
      "data": data // the chunk's payload as a BSON binary type
    });

    // Check that we are okay
    if (!cId)
      throw new Error('insert cannot create chunk ' + n + ' in file ' + fileObject.filename);
  } // EO chunk iteration

  // Return the newly created file id
  return fileId;
};

//register storage adaptor
UploadsCollection.registerStorageAdaptor("gridFS", {
  put: function(config) {
    var id = config.collection.insert(this);
    if (!id)
      return null;
    //return all info needed to retrieve or delete
    return {
      url: null,
      id: id
    };
  },
  get: function(config, info) {
    var fileId = info.id;
    
    //find chunks in the gridFS chunks collection for this file
    var query = config.collection.chunks.find({files_id: fileId}, {sort: {n: 1}});

    // Allocate memory for buffer
    var fileSize = +info.length; //+ Due to Meteor issue
    var buffer = new Buffer(fileSize);

    // Fill buffer from BSON data
    query.rewind();
    var start = 0;
    query.forEach(function(chunk) {
      var data = chunk.data || [];
      for (var i = 0, ln = data.length; i < ln; i++) {
        buffer[start + i] = data[i];
        start++;
      }
    }); //EO each chunks
    
    if (start < fileSize) {
      //some chunks are missing
      return;
    }
    
    return buffer;
  },
  getBytes: function(config, info, length, position) {
    var chunkNumber = Math.floor(position / length); //TODO handle requests that are not a full chunk or span multiple chunks
    var chunk = config.collection.chunks.findOne({files_id: info.id, n: chunkNumber});
    return chunk ? chunk.data : null;
  },
  del: function(config, info) {
    config.collection.remove({_id: info.id});
    return true;
  }
});