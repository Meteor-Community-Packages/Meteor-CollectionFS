//exported
UploadRecord = function(collectionFS, fileRecord) {
  var self = this;
  _.extend(self, fileRecord);
  self._collectionFS = collectionFS;
};