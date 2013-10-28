UploadRecord.prototype.removeCopy = function(copyName) {
  var self = this,
          copyDefinition = self._collectionFS._copies[copyName],
          copyInfo = self.copies[copyName];

  if (!copyDefinition || !copyDefinition.saveTo || !__storageAdaptors[copyDefinition.saveTo] || !copyInfo)
    return;

  var success;
  try {
    success = __storageAdaptors[copyDefinition.saveTo].del(self._collectionFS._name, copyDefinition.config, copyInfo);
  } catch (e) {
    success = false;
  }

  //set copyInfo to null to indicate that this copy of the file does not exist
  var setObj = {};
  setObj["copies." + copyName] = null;
  self._collectionFS.update({_id: self._id}, {$set: setObj});

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

UploadRecord.prototype.saveCopies = function() {
  var self = this,
      setNull = false, 
      cfs = self._collectionFS,
      copyList = cfs._copies;

  // Load buffer into fileObject
  var fileObject = self.toFileObject();
  if (fileObject.allChunksUploaded()) {
    fileObject.loadBuffer();
    fileObject.setId(void 0); //remove ._id so that it is not set when passed to file handler functions
  }

  // If we were unable to load the chunks from the chunksCollection into the buffer,
  // that means that the server was restarted so we lost the uploaded data.
  // We should proceed to set values to null to indicate that there will be no copy.
  if (!fileObject.buffer || fileObject.buffer.length === 0) {
    setNull = true;
  }

  var uploadRecordID = self._id, someFailed = false;

  //loop through user-defined filehandler functions and execute them
  for (var copyName in copyList) {
    // Have we already saved or attempted to save this copy?
    var hasBeenRun = (self.copies && self.copies[copyName]);

    // If we've already attempted to save, how many times has it failed? Default to 0.
    var sumFailes = (hasBeenRun && self.copies[copyName].failures) ? self.copies[copyName].failures : 0;

    // If we've never attempted to save this copy or we've attempted and failed
    // fewer than the maximum number of tries, try to save it now.
    if (!hasBeenRun || sumFailes < __filehandlerConfig.MaxFailes) {
      var setObj = {};

      var copyDefinition = copyList[copyName];

      if (!copyDefinition || !copyDefinition.saveTo || !__storageAdaptors[copyDefinition.saveTo])
        throw new Error('Copy definition "' + copyName + '" must have a "saveTo" property with a valid string value');

      var result = false;
      if (setNull) {
        result = null;
      } else {
        var copyOfFileObject = _.clone(fileObject);

        // Call the beforeSave function provided by the user
        copyDefinition.beforeSave && copyDefinition.beforeSave.apply(copyOfFileObject);

        // Call the put function for the requested storage adaptor,
        // passing in the user-provided storage adaptor settings
        // and a copy of the FileObject.
        try {
          result = __storageAdaptors[copyDefinition.saveTo].put(cfs._name, copyDefinition.config, copyOfFileObject);
        } catch (e) {
          throw new Error('Error saving copy with name "' + copyName + '": ' + (e.trace || e.message));
        }
      }

      // Ensures that the value returned by the put function
      // is an object, and adda a createdAt property.
      var normalizeFilehandle = function(func, fileData, fo) {
        var myData = {};
        myData['copies.' + func] = fileData || {};
        myData['copies.' + func].storageAdaptor = copyDefinition.saveTo;
        myData['copies.' + func].createdAt = Date.now();
        if (fo) {
          // These properties could change per file copy (in the beforeSave function)
          // so we store them with the other copy information, for use in
          // later downloading the data.
          myData['copies.' + func].filename = fo.filename;
          myData['copies.' + func].contentType = fo.contentType;
          myData['copies.' + func].length = fo.length;
        }
        return myData;
      };

      // If the put function returns null, we will not attempt to save again
      // in the future. This copy will not exist.
      if (result === null) {
        setObj['copies.' + copyName] = null;
      }

      // If the put function returns false, we may attempt to save again
      // in the future. Increment the number of failures in the upload record
      // so that we do not try too many times.
      else if (result === false) {
        // Increment the number of failures
        sumFailes++;

        // If we haven't yet failed the max number of times, increment
        // the failures count in the database, and the listener will
        // try again later.
        if (sumFailes < __filehandlerConfig.MaxFailes) {
          setObj = normalizeFilehandle(copyName, {failures: (sumFailes + 1)});
          someFailed = true;
        }

        // If we have failed the max number of times, set to null.
        // The file will not be created.
        else {
          setObj['copies.' + copyName] = null;
        }
      }

      // The put function successfully saved the file copy and returned a handle
      else {
        setObj = normalizeFilehandle(copyName, result, copyOfFileObject);
      }

      cfs._collection.update({_id: uploadRecordID}, {$set: setObj});

    } // EO if not tried or try again
  } //EO loop through copy list

  // If there were no failures that need retrying, we're done creating copies
  // for this upload record. We can remove all chunks from the temporary collection.
  if (!someFailed) {
    cfs._chunksCollection.remove({files_id: uploadRecordID});
  }

  //mark as handled in DB
  cfs._collection.update({_id: uploadRecordID}, {$set: {handledAt: Date.now(), needsMoreHandling: someFailed}});
};

UploadRecord.prototype.toFileObject = function() {
  var self = this;
  return new FileObject(self, self._collectionFS._chunksCollection);
};