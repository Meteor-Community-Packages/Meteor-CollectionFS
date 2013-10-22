/* cfs-storage-gridfs
 * A gridFS storage adaptor for the collectionFS package.
 * 2013-10-22
 *
 * By Eric Dobbertin with some code originally by Morten N.O. Henriksen, http://gi2.dk
 *
 */
"use strict";

//register storage adaptor
CollectionFS.registerStorageAdaptor("gridFS", {
  put: function(name, config, fileObject) {
    var id = gridFSWithName(name).insert(fileObject);
    if (!id)
      return null;
    //return all info needed to retrieve or delete
    return {
      id: id
    };
  },
  get: function(name, config, info) {
    var fileId = info.id;
    
    //find chunks in the gridFS chunks collection for this file
    var query = gridFSWithName(name).chunks.find({files_id: fileId}, {sort: {n: 1}});

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
  getBytes: function(name, config, info, length, position) {
    var chunkNumber = Math.floor(position / length); //TODO handle requests that are not a full chunk or span multiple chunks
    var chunk = gridFSWithName(name).chunks.findOne({files_id: info.id, n: chunkNumber});
    return chunk ? chunk.data : null;
  },
  del: function(name, config, info) {
    gridFSWithName(name).files.remove({_id: info.id});
    return true;
  }
});

var gridFSList = []; //caches any GridFS instances we create

// Returns a reference to a GridFS instance
// with the given name, creating one if necessary.
var gridFSWithName = function (name) {
  var gridFS;
  for (var i = 0, ln = gridFSList.length; i < ln; i++) {
    gridFS = gridFSList[i];
    if (gridFS._name === name) {
      return gridFS;
    }
  }
  
  gridFS = new GridFS(name);
  gridFSList.push(gridFS);
  return gridFS;
};