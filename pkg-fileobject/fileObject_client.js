FileObject.fromFile = function(file) {
  check(file, File);

  var fileObject = new FileObject({
    length: '' + file.size,
    filename: file.name,
    contentType: file.type,
    encoding: (file.encoding && file.encoding.length) ? file.encoding : 'utf-8' // Default 'utf-8'
  });
  
  fileObject.blob = new Blob([file], {type: file.type});
  return fileObject;
};

FileObject.prototype.toDataUrl = function(callback) {
  if (typeof callback !== 'function')
    throw new Error("toDataUrl requires function as callback");
  
  if (typeof FileReader === "undefined")
    throw new Error("Browser does not support FileReader");

  var self = this;
  var fileReader = new FileReader();
  fileReader.onload = function(event) {
    callback(event.target.result);
  };
  
  if (self.blob) {
    fileReader.readAsDataURL(self.blob);
  }
};

FileObject.prototype.getChunk = function(chunkNumber, callback) {
  var self = this, blob = self.blob, chunkSize = self.chunkSize;
  
  if (!blob || !chunkSize)
    throw new Error("getChunk requires that data is loaded in the FileObject and chunkSize is set");
  
  callback = callback || function () {};

  var myreader = new FileReader();
  var start = chunkNumber * chunkSize;
  var end = start + chunkSize;
  end = Math.min(end, blob.size);
  
  var slice = blob.slice || blob.webkitSlice || blob.mozSlice;
  if (!slice)
    throw new Error('Slice function not supported');
  
  var chunk = slice.call(blob, start, end, blob.type);

  myreader.onload = function() {
    var result = new Uint8Array(myreader.result);
    callback(chunkNumber, result);
  };
  myreader.readAsArrayBuffer(chunk);
};

FileObject.prototype.addDataChunk = function(chunkNumber, data) {
  var self = this;
  self._addedChunks = self._addedChunks || []; //we remove when not in use to keep the object properties clean
  self._addedChunks[chunkNumber] = data;
  
  //When all chunks are present, automatically convert them into a Blob
  if (self._addedChunks && self._addedChunks.length === self.expectedChunks()) {
    self.blob = new Blob(self._addedChunks, {type: self.contentType});
    delete self._addedChunks;
  }
};

FileObject.prototype.saveLocal = function() {
  if (typeof window === "undefined")
    throw new Error("window must be defined to saveLocal");

  var self = this;
  if (self.blob) {
    window.saveAs(self.blob, self.filename);
  }
};