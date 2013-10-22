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
    //get throwaway fileObject so that its methods can be used for convenience
    var fileObject = new FileObject({
      _id: info.id,
      length: info.length,
      filename: info.filename,
      contentType: info.contentType
    });
    
    fileObject.chunksCollection = gridFSWithName(name).chunks;
    fileObject.loadBuffer();
    return fileObject.buffer;
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