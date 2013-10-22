// Configuration flags
__filehandlerConfig = {
  MaxRunning: 1,
  // The max number of filehandlers you want running at the same time in total on server,
  // not per collectionFS

  Running: 0,
  // Counter tracks number of filehandlers running at the same time in total on server,
  // not per collectionFS

  MaxFailes: 3,
  // Will attempt to create each copy of an uploaded file this many times. Default 3.

  waitBeforeCheckingQueue: 1000,
  // How often to check the queue for each collectionFS for files that have been uploaded and need copies saved.
  // Default 1000ms / 1sec, 0 disables filehandlers

  waitBeforeCheckingQueueWhenNoFilehandlers: 5000
  // How often to check the queue for files that have been uploaded and need copies saved
  // when the collectionFS has not defined any copies.
  // Default 5000ms / 5sec - no filehandlers defined yet, we wait? 0 disables
};

_queueListener = function(collectionFS) {
  var self = this;
  self._collectionFS = collectionFS;

  //Spawn initial file handler
  Meteor.setTimeout(function() {
    self.checkQueue();
  }, 0);

};//EO queueListener

_.extend(_queueListener.prototype, {
  checkQueue: function() {
    var self = this;
    //check items in queue and init workers for conversion
    if (self._collectionFS) {
      if (self._collectionFS._copies) {
        // Run file handler if there aren't too many running (per server, not per upload record)
        if (__filehandlerConfig.Running < __filehandlerConfig.MaxRunning) {
          __filehandlerConfig.Running++;

          // First, try to find new unhandled uploads
          var uploadRecord = self._collectionFS._collection.findOne({handledAt: null, complete: true});
          
          // Second, try to find new copies requested, not yet attempted
          if (!uploadRecord) {
            // Create a $or query array from filehandlers
            var queryFilehandlersExists = [];
            for (var copyName in self._collectionFS._copies) {
              var queryExists = {};
              queryExists['copies.' + copyName] = {$exists: false};
              queryFilehandlersExists.push(queryExists);
            }

            //Where one of the fileHandlers are missing
            if (queryFilehandlersExists.length > 0) {
              uploadRecord = self._collectionFS._collection.findOne({
                complete: true,
                $or: queryFilehandlersExists
              });
            }
          } // EO try to find new copies

          // Third, try to find failed copies
          if (!uploadRecord) {
            // Create a $or query array from filehandlers
            var queryFilehandlersExists = [];
            for (var copyName in self._collectionFS._copies) {
              var queryExists = {};
              queryExists['copies.' + copyName + '.failures'] = {$gt: 0, $lt: __filehandlerConfig.MaxFailes};
              queryFilehandlersExists.push(queryExists);
            }

            //Where one of the fileHandlers has previously failed fewer than the maximum number of times
            if (queryFilehandlersExists.length > 0) {
              uploadRecord = self._collectionFS._collection.findOne({
                complete: true,
                $or: queryFilehandlersExists
              });
            }
          }

          // Save requested copies for the upload record that was found
          if (uploadRecord) {
            self.saveCopies(uploadRecord);
          }
          __filehandlerConfig.Running--;
        } // EO Filehandler

        if (__filehandlerConfig.waitBeforeCheckingQueue) {
          Meteor.setTimeout(function() {
            self.checkQueue();
          }, __filehandlerConfig.waitBeforeCheckingQueue);
        }
      } else {
        if (__filehandlerConfig.waitBeforeCheckingQueueWhenNoFilehandlers) {
          Meteor.setTimeout(function() {
            self.checkQueue();
          }, __filehandlerConfig.waitBeforeCheckingQueueWhenNoFilehandlers);
        }
      }
    } //No collection?? can't go on..
  }, //EO checkQueue

  saveCopies: function(uploadRecord) {
    var self = this, setNull = false;
    var copyList = self._collectionFS._copies;

    // Load buffer into fileObject
    var fileObject = uploadRecord.toFileObject();
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

    var uploadRecordID = uploadRecord._id, someFailed = false;

    //loop through user-defined filehandler functions and execute them
    for (var copyName in copyList) {
      // Have we already saved or attempted to save this copy?
      var hasBeenRun = (uploadRecord.copies && uploadRecord.copies[copyName]);

      // If we've already attempted to save, how many times has it failed? Default to 0.
      var sumFailes = (hasBeenRun && uploadRecord.copies[copyName].failures) ? uploadRecord.copies[copyName].failures : 0;

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
            result = __storageAdaptors[copyDefinition.saveTo].put(self._collectionFS._name, copyDefinition.config, copyOfFileObject);
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
        
        self._collectionFS._collection.update({_id: uploadRecordID}, {$set: setObj});

      } // EO if not tried or try again
    } //EO loop through copy list

    // If there were no failures that need retrying, we're done creating copies
    // for this upload record. We can remove all chunks from the temporary collection.
    if (!someFailed) {
      self._collectionFS._chunksCollection.remove({files_id: uploadRecordID});
    }

    //mark as handled in DB
    self._collectionFS._collection.update({_id: uploadRecordID}, {$set: {handledAt: Date.now()}});
  }
});//EO queueListener extend