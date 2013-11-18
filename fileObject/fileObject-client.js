FileObject.prototype.loadBlob = function(blob) {
  check(blob, Blob);
  var self = this;
  self.blob = blob;
  self.size = blob.size;
  self.type = blob.type;
};

FileObject.prototype.saveLocal = function() {
  if (typeof window === "undefined")
    throw new Error("window must be defined to use saveLocal");

  var self = this;
  if (self.blob) {
    window.saveAs(self.blob, self.name);
  }
};