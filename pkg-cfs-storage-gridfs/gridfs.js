// not exported
GridFS = function(name) {
  var self = this;
  self._name = name || "fs";

  //create collections
  self.files = new Meteor.Collection(self._name + '.files', {
    _preventAutopublish: true
  });
  self.chunks = new Meteor.Collection(self._name + '.chunks', {
    _preventAutopublish: true
  });

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n
    self.chunks._ensureIndex({files_id: 1, n: 1}, {unique: true});

    //watch for files removal and remove corresponding chunks
    self.files.find().observe({
      removed: function(doc) {
        doc._id && self.chunks.remove({files_id: doc._id});
      } // EO removed
    }); // EO observe
  }); // EO startup
}; //EO GridFS

GridFS.prototype.insert = function(fileObject) {
  var self = this, buffer = fileObject.buffer;

  if (!fileObject.buffer)
    throw new Error("cannot insert FileObject into a GridFS unless its buffer is set");

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