FileObject.fromFile = function(file) {
  check(file, File);

  return new FileObject({
    file: file,
    length: '' + file.size,
    filename: file.name,
    contentType: file.type,
    encoding: (file.encoding && file.encoding !== '') ? file.encoding : 'utf-8' // Default 'utf-8'
  });
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
  } else if (self.file) {
    fileReader.readAsDataURL(self.file);
  }
};

FileObject.prototype.getChunk = function(chunkNum, callback) {
  check(chunkNum, Number);
  check(callback, Function);

  var self = this;
  var f = self.file;
  var myreader = new FileReader();
  var start = chunkNum * self.chunkSize;
  //make sure not to exceed boundaries
  var stop = Math.min(start + self.chunkSize, f.size);
  var slice = f.slice || f.webkitSlice || f.mozSlice;
  var blob = slice.call(f, start, stop, f.contentType);

  myreader.onloadend = function(evt) {
    if (evt.target.readyState === FileReader.DONE) {
      callback(chunkNum, evt.target.result);
    }
  };

  if (!blob)
    throw new Error('Slice function not supported');

  myreader.readAsBinaryString(blob);
};

FileObject.prototype.addDataChunk = function(chunkNumber, data) {
  var self = this;

  var carry = [];
  for (var i = 0; i < data.length; i++) {
    carry.push(data.charCodeAt(i));
  }

  self._addedChunks = self._addedChunks || []; //we remove when not in use to keep the object properties clean
  self._addedChunks[chunkNumber] = new Uint8Array(carry); //TODO: use EJSON.binary()
  
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
  } else if (self.file) {
    window.saveAs(self.file, self.filename);
  }
};