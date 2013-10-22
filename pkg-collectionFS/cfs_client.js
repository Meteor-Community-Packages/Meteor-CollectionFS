//exported
CollectionFS = function(name) {
  var self = this;
  self._name = name;
  self._filter = null;
  self._collection = new Meteor.Collection(name + ".uploads", {
    transform: function(doc) {
      return new UploadRecord(self, doc);
    }
  });

  self.uploadManager = new GQ.Queue();
  self.uploadManager.taskHandler = function(task) {
    var fileObject = task.taskData.fo;
    var expectedChunks = fileObject.expectedChunks();

    //update progress
    if (!fileObject._addedChunks) {
      task.updateProgress(0);
    } else {
      task.updateProgress((fileObject._addedChunks.length / expectedChunks) * 100);
    }

    var uploadChunk = function(chunkNum) {
      fileObject.getChunk(chunkNum, function(chunkNum, data) {
        Meteor.apply(
                "uploadChunk_" + self._name,
                [task.taskData.id, chunkNum, data],
                {
                  wait: true
                },
        function(err, result) {
          if (err) {
            task.done(err);
            return;
          }

          chunkNum++;
          if (chunkNum > expectedChunks - 1) {
            //we've uploaded all chunks
            task.done();
          } else {
            uploadChunk(chunkNum);
          }
        }
        );
      });
    };

    uploadChunk(0);
  };
  self.uploadManager.start();

  //initiate new generic queue for downloads
  self.downloadManager = new GQ.Queue();
  self.downloadManager.taskHandler = function(task) {
    var fileObject = task.taskData.fo;
    var length = fileObject.length;
    var chunkSize = fileObject.chunkSize;
    var expectedChunks = fileObject.expectedChunks();

    //update progress
    if (!fileObject._addedChunks) {
      task.updateProgress(0);
    } else {
      task.updateProgress((fileObject._addedChunks.length / expectedChunks) * 100);
    }

    var downloadChunk = function(position) {
      Meteor.apply(
              "downloadBytes_" + self._name,
              [fileObject._id, task.taskData.copyName, chunkSize, position],
              {
                wait: true
              },
      function(err, chunk) {
        if (err) {
          task.done(err);
          return;
        }
        
        //append chunk TODO should be addDataBytes?
        fileObject.addDataChunk((position / chunkSize), chunk);

        position = position + chunkSize;
        if (position > length - 1) {
          //we've downloaded all chunks
          if (!fileObject.blob)
            throw new Error("unable to download Blob for FileObject with ID " + fileObject._id);

          task.done();
        } else {
          downloadChunk(position);
        }
      }
      );
    };

    downloadChunk(0);
  };
  self.downloadManager.start();
};

/*
 * Public Methods
 */

CollectionFS.prototype._insert = function(fileObject, callback) {
  var self = this;

  var fileRecord = _.extend({}, fileObject.filesDocument(), {
    totalChunks: fileObject.expectedChunks(),
    uploadedChunks: 0,
    complete: false
  });

  if ("_id" in fileRecord) {
    delete fileRecord._id;
  }

  self._collection.insert(fileRecord, function(err, id) {
    if (err && callback)
      callback(err);
    else if (err)
      throw err;
    else {
      var uploadRecord = self._collection.findOne({_id: id});
      uploadRecord.upload(fileObject, callback);
    }
  });
};

CollectionFS.prototype.insert = function(document, callback) {
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
    throw new Error("invalid first argument for CollectionFS.insert");
  }
};