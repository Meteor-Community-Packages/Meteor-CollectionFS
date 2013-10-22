UploadRecord.prototype.urlForCopy = function(copyName) {
  var self = this;
  if (!self.copies || !self.copies[copyName])
    return "";
  return "/files/" + self._uploadsCollection._name + "/" + self._id + "/" + copyName + "/" + self.copies[copyName].filename;
};

UploadRecord.prototype.downloadCopy = function(copyName, callback) {
  var self = this;

  var fileObject = new FileObject({
    _id: self._id,
    filename: self.copies[copyName].filename,
    contentType: self.copies[copyName].contentType,
    length: self.copies[copyName].length
  });

  var task = self._uploadsCollection.downloadManager.addTask({
    id: self._id,
    fo: fileObject,
    copyName: copyName
  });
  task.on("done", function() {
    var fileObject = task.taskData.fo;
    if (!fileObject.blob) {
      var err = new Error('unable to download Blob for the "' + copyName + '" copy of the UploadRecord with ID ' + self._id);
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
    } else {
      callback && callback(null, fileObject);
    }
  });
  task.on("error", function(err) {
    if (callback)
      callback(err);
    else
      throw err;
  });
  task.ready();
};

//UploadRecord.prototype.isDownloadingCopy = function(copyName) {
//  var self = this;
//  if (!self._id || !self._uploadsCollection || !self._uploadsCollection.downloadManager)
//    return false;
//
//  var task = self._uploadsCollection.downloadManager.currentTask();
//
//  return (task.id === self._id && task.copyName === copyName);
//};

UploadRecord.prototype.upload = function(fileObject, callback) {
  var self = this;
  var task = self._uploadsCollection.uploadManager.addTask({
    id: self._id,
    fo: fileObject
  });
  task.on("done", function() {
    callback && callback(null, fileObject);
  });
  task.on("error", function(err) {
    if (callback)
      callback(err);
    else
      throw err;
  });
  task.ready();
};