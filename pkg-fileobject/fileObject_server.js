FileObject.prototype.allChunksUploaded = function () {
  var self = this;
  
  if (!self.chunksCollection)
    throw new Error("allChunksUploaded: FileObject does not have a pinned chunks collection");
  
  var fileId = self._id;
  
  //find all chunks for this ID
  var query = self.chunksCollection.find({files_id: fileId}, {sort: {n: 1}});
  return query.count() === self.expectedChunks();
};

FileObject.prototype._loadBuffer = function (buffer) {
  check(buffer, Buffer);
  var self = this;
  self.length = '' + buffer.length; // Issue in Meteor, when solved dont use ''+
  self.buffer = buffer;
};

FileObject.prototype.loadBuffer = function(buffer) {
  var self = this;
  
  if (buffer) {
    self._loadBuffer(buffer);
    return;
  }
  
  if (!self.chunksCollection)
    throw new Error("loadBuffer: FileObject does not have a pinned chunks collection");
  
  //if no buffer was passed in, set it from the pinned 
  
  var fileId = self._id;

  //find chunks in the CFS for this file
  var query = self.chunksCollection.find({files_id: fileId}, {sort: {n: 1}});

  if (query.count() < self.expectedChunks())
    throw new Error('file with ID ' + fileId + ' has missing chunks; cannot retrieve it');

  var fileSize = +self.length; //+ Due to Meteor issue
  var chunkSize = self.chunkSize;

  // Allocate memory for buffer
  buffer = new Buffer(fileSize);

  // Fill buffer from BSON data
  query.rewind();
  query.forEach(function(chunk) {
    var data = chunk.data;
    if (!data)
      throw new Error('loadBufferFromChunksCollection: no data in chunk ' + chunk.n + ' of file with _id ' + fileId);

    var start = chunk.n * chunkSize;
    for (var i = 0; i < data.length; i++) {
      buffer[start + i] = data[i];
    }
  }); //EO each chunks

  self._loadBuffer(buffer);
};

FileObject.prototype.getChunk = function(chunkNumber) {
  var self = this;
  
  if (!self.buffer || !self.chunkSize)
    throw new Error("getChunk requires a buffer loaded in the FileObject and chunk size");
  
  var start = chunkNumber * self.chunkSize;
  var end = start + self.chunkSize;
  end = Math.min(end, self.buffer.length);
  var total = end - start;
  var chunk = new UIntArray(total);
  for (var i = 0; i < total; i++) {
    chunk[i] = self.buffer[start + i];
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