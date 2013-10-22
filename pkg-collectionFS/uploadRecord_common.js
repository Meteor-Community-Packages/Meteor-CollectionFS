//exported
UploadRecord = function(collectionFS, fileRecord) {
  var self = this;
  _.extend(self, fileRecord);
  self._collectionFS = collectionFS;
};

UploadRecord.prototype.getExtension = function() {
  var name = this.filename;
  var found = name.lastIndexOf('.') + 1;
  return (found > 0 ? name.substr(found) : "");
};