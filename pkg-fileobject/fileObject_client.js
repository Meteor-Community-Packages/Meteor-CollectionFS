FileObject.fromFile = function(file) {
  check(file, File);

  var fileObject = new FileObject({
    length: '' + file.size,
    filename: file.name,
    contentType: file.type,
    encoding: (file.encoding && file.encoding.length) ? file.encoding : 'utf-8' // Default 'utf-8'
  });
  
  fileObject.blob = new Blob([file]);
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

FileObject.prototype.getChunk = function(chunkNum, callback) {
  check(chunkNum, Number);
  
  var self = this, f = self.blob;
  
  if (!f)
    throw new Error("FileObject must have an associated client File to call getChunk");
  
  callback = callback || function () {};

  var myreader = new FileReader();
  var start = chunkNum * self.chunkSize;
  //make sure not to exceed boundaries
  var stop = Math.min(start + self.chunkSize, f.size);
  var slice = f.slice || f.webkitSlice || f.mozSlice;
  var blob = slice.call(f, start, stop, f.contentType);
  
  if (!blob)
    throw new Error('Slice function not supported');

  myreader.onload = function() {
    var result = new Uint8Array(myreader.result);
    callback(chunkNum, result);
  };
  myreader.readAsArrayBuffer(blob);
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