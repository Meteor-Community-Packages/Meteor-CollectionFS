UploadRecord.prototype.removeCopy = function(copyName) {
  var self = this,
          copyDefinition = self._uploadsCollection._copies[copyName],
          copyInfo = self.copies[copyName];

  if (!copyDefinition || !copyDefinition.saveTo || !__storageAdaptors[copyDefinition.saveTo] || !copyInfo)
    return;

  var success;
  try {
    success = __storageAdaptors[copyDefinition.saveTo].del.call(self.toFileObject(), copyDefinition.config, copyInfo);
  } catch (e) {
    success = false;
  }

  //set copyInfo to null to indicate that this copy of the file does not exist
  var setObj = {};
  setObj["copies." + copyName] = null;
  self._uploadsCollection._collection.update({_id: self._id}, {$set: setObj});

  if (!success)
    throw new Error('Failed to delete the "' + copyName + '" copy of the uploaded file with ID ' + self._id);
};

UploadRecord.prototype.removeAllCopies = function() {
  var self = this;
  if (typeof self.copies === "object") {
    _.each(self.copies, function(copyInfo, copyName) {
      self.removeCopy(copyName);
    });
  }
};

UploadRecord.prototype.toFileObject = function() {
  var self = this;
  return new FileObject(self, self._uploadsCollection._chunksCollection);
};