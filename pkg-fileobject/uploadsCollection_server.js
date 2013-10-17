//exported
UploadsCollection = function(name, options) {
  var self = this;
  self._name = name;
  self._filter = null;
  self._fileHandlers = {};

  // Extend _options
  self._options = {
    autopublish: false,
    maxFilehandlers: __filehandlerConfig.MaxRunning
  };
  _.extend(self._options, options);

  __filehandlerConfig.MaxRunning = self._options.maxFilehandlers;

  //this one is a real, permanent collection
  self._collection = new Meteor.Collection(name + ".uploads", {
    transform: function(doc) {
      return new UploadRecord(self, doc);
    }
  });

  //this is used only during the upload and file handling and is unmanaged
  self._chunksCollection = new Meteor.Collection(null, {
    _preventAutopublish: true
  });

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n (can't do this on unmanaged collections)
    //self._chunksCollection._ensureIndex({files_id: 1, n: 1}, {unique: true});

    //start listener for this manager
    self._listener = new _queueListener(self);

    //live queries keep things in sync
    self._collection.find().observe({
      removed: function(uploadRecord) {
        // remove all temporary chunks for the removed file
        uploadRecord._id && self._chunksCollection.remove({files_id: uploadRecord._id});

        // remove all other copies
        uploadRecord.removeAllCopies();
      } // EO removed
    }); // EO Observer

    self._chunksCollection.find().observe({
      added: function(doc) {
        // if chunk was added, update chunk tracking in .files collection
        if (!doc.files_id)
          return;

        var fileInfo = self._collection.findOne({_id: doc.files_id});

        if (!fileInfo)
          return;

        fileInfo.uploadedChunks++;

        if (fileInfo.totalChunks === fileInfo.uploadedChunks) {
          //marking complete will cause the filehandling listener to begin processing it
          self._collection.update({_id: doc.files_id}, {
            $set: {
              complete: true,
              uploadDate: new Date
            },
            //chunk tracking info isn't needed anymore
            $unset: {
              uploadedChunks: 1,
              totalChunks: 1
            }
          });
        } else {
          self._collection.update({_id: doc.files_id}, {
            $inc: {
              uploadedChunks: 1
            }
          });
        }
      } // EO removed
    }); // EO Observer
  });

  //add server method to be called from client code
  var methods = {};
  methods["uploadChunk_" + name] = function(fileId, chunkNum, data) {
    check(fileId, String);
    check(chunkNum, Number);
    check(data, Uint8Array);
    
    this.unblock();

    var cId = self._chunksCollection.insert({
      files_id: fileId, // _id of the corresponding files collection entry
      n: chunkNum, // chunks are numbered in order, starting with 0
      data: data // the chunk's payload as a BSON binary type
    });

    if (!cId) //If chunk not added successfully
      throw new Error("problem adding chunk");
    return true;
  };
  Meteor.methods(methods);

};

/*
 * Public Methods
 */

UploadsCollection.prototype.fileHandlers = function(options) {
  _.extend(this._fileHandlers, options);
};

//TODO test
UploadsCollection.prototype.insert = function(document, callback) {
  var self = this, f, id;

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
    id = self._collection.insert(f, function(err, id) {
      typeof callback === "function" && callback(err, id);
    });

    //start upload for the inserted ID
    if (id) {
      document.setId(id);
      self._saveBufferToChunks(document);
    }
    return id;
  }

  else {
    throw new Error("invalid first argument for UploadsCollection.insert");
  }
};

/*
 * Private Methods
 */

UploadsCollection.prototype._saveBufferToChunks = function(fileObject) {
  // Check filename
  if (!fileObject.filename)
    throw new Error('_saveBufferToChunks: fileObject.filename must be set');

  if (!fileObject.buffer)
    throw new Error('_saveBufferToChunks: fileObject.buffer must be set');

  var self = this;
  var fileId = fileObject._id;
  
  fileObject.forEachChunk(function (chunkNum, data) {
    // Save data chunk into database
    var cId = self._chunksCollection.insert({
      "files_id": fileId, // _id of the corresponding files collection entry
      "n": chunkNum, // chunks are numbered in order, starting with 0
      "data": data // the chunk's payload as a BSON binary type
    });

    // Check that we are okay
    if (!cId)
      throw new Error('_saveBufferToChunks: could not add chunk ' + chunkNum + ' of file ' + fileObject.filename + ' to _chunksCollection');
  });
};