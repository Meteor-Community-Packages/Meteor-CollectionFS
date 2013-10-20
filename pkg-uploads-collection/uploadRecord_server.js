UploadRecord.prototype.removeCopy = function(fileHandler) {
  var self = this, funcs = self._uploadsCollection._fileHandlers[fileHandler];
  var fhValue = self.fileHandler[fileHandler];
  if (funcs && funcs.del && fhValue) {
    var success;
    try {
      success = funcs.del.call(self.toFileObject(), fhValue);
    } catch (e) {
      success = false;
    }

    //set filehandler value to null to indicate that no file exists for this handler
    var setObj = {};
    setObj["fileHandler." + fileHandler] = null;
    self._uploadsCollection._collection.update({_id: self._id}, {$set: setObj});
    
    if (!success)
      throw new Error("The del function for the " + fileHandler + " filehandler failed for file with ID " + self._id);
  }
};

UploadRecord.prototype.removeAllCopies = function() {
  var self = this;
  if (typeof self.fileHandler === "object") {
    _.each(self.fileHandler, function(fhInfo, fhName) {
      self.removeCopy(fhName);
    });
  }
};

UploadRecord.prototype.toFileObject = function() {
  var self = this;
  return new FileObject(self, self._uploadsCollection._chunksCollection);
};