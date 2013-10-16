//extend FileObject with CFS-specific methods
if (typeof FileObject !== "undefined") {
  FileObject.prototype.loadBlobFromCFS = function (callback) {
    var self = this;
    
    if (!self._id)
      throw new Error("loadBlobFromCFS: FileObject does not have an _id");
    
    if (!self.collection)
      throw new Error("loadBlobFromCFS: FileObject is not pinned to a collection");
    
    self.collection.downloadManager._downloadBlob(self, function (blob) {
      self.blob = blob;
      callback && callback();
    });
  };
}