//exported
UploadRecord = function(uploadsCollection, fileRecord) {
  var self = this;
  _.extend(self, fileRecord);
  self._uploadsCollection = uploadsCollection;
};