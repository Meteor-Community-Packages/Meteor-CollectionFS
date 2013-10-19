//exported
UploadsCollection = function(name) {
  var self = this;
  self._name = name;
  self._filter = null;
  self._collection = new Meteor.Collection(name + ".uploads", {
    transform: function(doc) {
      return new UploadRecord(self, doc);
    }
  });
  self.uploadManager = new _uploadManager(self); //upload manager is client side only
};

/*
 * Public Methods
 */

UploadsCollection.prototype._insert = function(fileObject, callback) {
  var self = this;
  callback = callback || function() {};

  var fileRecord = _.extend({}, fileObject.filesDocument(), {
    totalChunks: fileObject.expectedChunks(),
    uploadedChunks: 0,
    complete: false
  });

  if ("_id" in fileRecord) {
    delete fileRecord._id;
  }

  self._collection.insert(fileRecord, function(err, id) {
    if (err)
      throw err;

    //start upload for the inserted ID
    fileObject.setId(id);
    self.uploadManager._uploadBlob(fileObject);

    callback(err, id);
  });
};

UploadsCollection.prototype.insert = function(document, callback) {
  var self = this;

  //passed in a single FileObject
  if (Match.test(document, FileObject)) {
    self._insert(document, callback);
  }

  //passed in an array of FileObjects
  else if (Match.test(document, [FileObject])) {
    for (var i = 0, ln = document.length; i < ln; i++) {
      self._insert(document[i], callback);
    }
  }

  //passed in a single File
  else if (Match.test(document, File)) {
    var fo = FileObject.fromFile(document);
    self._insert(fo, callback);
  }

  //passed in an array of Files
  else if (Match.test(document, Match.OneOf([File], FileList))) {
    for (var i = 0, ln = document.length; i < ln; i++) {
      var fo = FileObject.fromFile(document[i]);
      self._insert(fo, callback);
    }
  }

  else {
    throw new Error("invalid first argument for UploadsCollection.insert");
  }
};