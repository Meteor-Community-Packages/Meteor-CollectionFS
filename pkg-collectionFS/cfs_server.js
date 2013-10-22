//exported
CollectionFS = function(name, options) {
  var self = this;
  self._name = name;
  self._filter = null;
  self._copies = {};

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

  //filter
  self._collection.before.insert(function(userId, doc) {
    var uploadRecord = this.transform();
    return self.fileIsAllowed(uploadRecord);
  });
  //don't allow any updates from the client
  self._collection.deny({
    insert: function() {
      return false;
    },
    update: function() {
      return true;
    },
    remove: function() {
      return false;
    },
    fetch: []
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
  methods["downloadBytes_" + name] = function(fileId, copyName, length, position) {
    check(fileId, String);
    check(copyName, String);
    check(length, Number);
    check(position, Number);

    var copyList = self._copies, copyDefinition = copyList[copyName];

    if (!copyDefinition || !copyDefinition.saveTo || !__storageAdaptors[copyDefinition.saveTo])
      throw new Error('Copy definition "' + copyName + '" must have a "saveTo" property with a valid string value');

    this.unblock();

    var uploadRecord = self.findOne({_id: fileId});

    if (!uploadRecord)
      throw new Error("Invalid UploadRecord ID passed to downloadChunk");

    var copyInfo = uploadRecord.copies[copyName];

    return __storageAdaptors[copyDefinition.saveTo].getBytes(name, copyDefinition.config, copyInfo, length, position);
  };
  Meteor.methods(methods);

  var httpMethods = {};
  httpMethods['/files/' + name + '/:id/:copyName/:filename'] = {
    get: function() {
      var fileId = this.params.id;
      var copyName = this.params.copyName;
      var copyList = self._copies, copyDefinition = copyList[copyName];

      if (!copyDefinition || !copyDefinition.saveTo || !__storageAdaptors[copyDefinition.saveTo])
        return;

      //this.unblock(); //not currently implemented

      var uploadRecord = self.findOne({_id: fileId});

      if (!uploadRecord)
        return;

      var copyInfo = uploadRecord.copies[copyName];

      this.setContentType(copyInfo.contentType);
      this.setStatusCode(200);
      return __storageAdaptors[copyDefinition.saveTo].get(name, copyDefinition.config, copyInfo);
    }
  };
  HTTP.methods(httpMethods);
};

/*
 * Public Methods
 */

CollectionFS.prototype.copies = function(options) {
  _.extend(this._copies, options);
};

//TODO test
CollectionFS.prototype.insert = function(document, callback) {
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
      document.chunksCollection = self._chunksCollection;
      document.saveBuffer();
    }
    return id;
  }

  else {
    throw new Error("invalid first argument for CollectionFS.insert");
  }
};