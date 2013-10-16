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

UploadsCollection.prototype.insert = function(document, callback) {
  var self = this, f;

  var getFileRecord = function(fileObject) {
    var fileRecord = _.extend({}, fileObject.filesDocument(), {
      totalChunks: fileObject.expectedChunks(),
      uploadedChunks: 0,
      complete: false
    });

    if ("_id" in fileRecord) {
      delete fileRecord._id;
    }

    return fileRecord;
  };

  //passed in a single FileObject
  if (Match.test(document, FileObject)) {
    f = getFileRecord(document);
    self._collection.insert(f, function(err, id) {
      if (err)
        throw err;

      //start upload for the inserted ID
      document.setId(id);
      self.uploadManager._uploadBlob(document);

      typeof callback === "function" && callback(err, id);
    });
  }

  //passed in an array of FileObjects
  else if (Match.test(document, [FileObject])) {
    var fo;
    for (var i = 0, ln = document.length; i < ln; i++) {
      fo = document[i];
      f = getFileRecord(document[i]);
      self._collection.insert(f, function(err, id) {
        if (err)
          throw err;

        //start upload for the inserted ID
        fo.setId(id);
        self.uploadManager._uploadBlob(fo);

        typeof callback === "function" && callback(err, id);
      });
    }
  }

  //passed in a single File
  else if (Match.test(document, File)) {
    var fo = FileObject.fromFile(document);
    f = getFileRecord();
    self._collection.insert(f, function(err, id) {
      if (err)
        throw err;

      //start upload for the inserted ID
      fo.setId(id);
      self.uploadManager._uploadBlob(fo);

      typeof callback === "function" && callback(err, id);
    });
  }

  //passed in an array of Files
  else if (Match.test(document, Match.OneOf([File], FileList))) {
    var fo;
    for (var i = 0, ln = document.length; i < ln; i++) {
      fo = FileObject.fromFile(document[i]);
      f = getFileRecord(fo);
      self._collection.insert(f, function(err, id) {
        if (err)
          throw err;

        //start upload for the inserted ID
        fo.setId(id);
        self.uploadManager._uploadBlob(fo);

        typeof callback === "function" && callback(err, id);
      });
    }
  }

  else {
    throw new Error("invalid first argument for UploadsCollection.insert");
  }
};