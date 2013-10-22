FileObject.prototype.allChunksUploaded = function() {
  var self = this;

  if (!self.chunksCollection)
    throw new Error("allChunksUploaded: FileObject does not have a pinned chunks collection");

  var fileId = self._id;

  //find all chunks for this ID
  var query = self.chunksCollection.find({files_id: fileId}, {sort: {n: 1}});
  return query.count() === self.expectedChunks();
};

FileObject.prototype._loadBuffer = function(buffer) {
  check(buffer, Buffer);
  var self = this;
  self.length = '' + buffer.length; // Issue in Meteor, when solved dont use ''+
  self.buffer = buffer;
};

/*
 * Loads the given buffer into myFileObject.buffer, or
 * if no buffer is given, loads all chunks from myFileObject.chunksCollection
 * into myFileObject.buffer.
 */
FileObject.prototype.loadBuffer = function(buffer) {
  var self = this;

  if (buffer) {
    self._loadBuffer(buffer);
    return;
  }

  if (!self.chunksCollection)
    throw new Error("loadBuffer: FileObject does not have a pinned chunks collection");

  //if no buffer was passed in, set it from the pinned chunksCollection

  var fileId = self._id;

  //find chunks in the CFS for this file
  var query = self.chunksCollection.find({files_id: fileId}, {sort: {n: 1}});

  var fileSize = +self.length; //+ Due to Meteor issue
  var chunkSize = fileSize / query.count;

  // Allocate memory for buffer
  buffer = new Buffer(fileSize);

  // Fill buffer from BSON data
  query.rewind();
  var chunkSize;
  query.forEach(function(chunk) {
    var data = chunk.data;
    if (!data)
      throw new Error('loadBufferFromChunksCollection: no data in chunk ' + chunk.n + ' of file with _id ' + fileId);

    chunkSize = chunkSize || data.length;
    var start = chunk.n * chunkSize;
    for (var i = 0; i < data.length; i++) {
      buffer[start + i] = data[i];
    }
  }); //EO each chunks

  self._loadBuffer(buffer);
};

/*
 * Saves myFileObject.buffer into myFileObject.chunksCollection.
 */
FileObject.prototype.saveBuffer = function() {
  var self = this, fileId = self._id;

  if (!self.chunksCollection)
    throw new Error("saveBuffer: FileObject does not have a pinned chunks collection");

  self.forEachChunk(function(chunkNum, data) {
    // Save data chunk into database
    var cId = self.chunksCollection.insert({
      "files_id": fileId, // _id of the corresponding files collection entry
      "n": chunkNum, // chunks are numbered in order, starting with 0
      "data": data // the chunk's payload as a BSON binary type
    });

    // Check that we are okay
    if (!cId)
      throw new Error('saveBuffer: could not add chunk ' + chunkNum + ' of file ' + self.filename + ' to chunksCollection');
  });
};

FileObject.prototype.getChunk = function(chunkNumber) {
  var self = this, buffer = self.buffer, chunkSize = self.chunkSize;

  if (!buffer || !chunkSize)
    throw new Error("getChunk requires that data is loaded in the FileObject and chunkSize is set");

  var start = chunkNumber * chunkSize;
  var end = start + chunkSize;
  end = Math.min(end, buffer.length);
  var total = end - start;
  var chunk = new UIntArray(total);
  for (var i = 0; i < total; i++) {
    chunk[i] = buffer[start + i];
  }

  return chunk;
};

FileObject.prototype.forEachChunk = function(callback) {
  var self = this, total = self.expectedChunks(), chunk;
  for (var n = 0; n < total; n++) {
    chunk = self.getChunk(n);
    callback(chunk, n);
  }
};

FileObject.prototype.toDataUrl = function() {
  var self = this;

  if (!self.buffer || !self.contentType)
    throw new Error("toDataUrl requires a buffer loaded in the FileObject and a contentType");

  var data_uri_prefix = "data:" + self.contentType + ";base64,";
  return data_uri_prefix + self.buffer.toString("base64");
};