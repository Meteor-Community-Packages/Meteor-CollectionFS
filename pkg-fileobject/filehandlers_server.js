// Configuration flags
__filehandlerConfig = {
  MaxRunning: 1,
  // Max filehandlers running at the same time in total on server,
  // not pr. collectionFS

  Running: 0,
  // Filehandlers running at the same time in total on server,
  // not pr. collectionFS

  MaxFailes: 3,
  // Retries each failed filehandler 3 times and moves on to next failed

  // Allow a reset of filehandler failures to try again?
  AllowFailesRetry: 60 * 1000,
  // Wait ms before trying again, if == 0 then disabled

  _AllowFailesRetryLastTime: 0,
  // Auto - Carry for wait timer

  // How often to run filehandlers pr. file
  waitBeforeCheckingQueue: 1000,
  // Default 1000ms / 1sec, 0 disables filehandlers

  waitBeforeCheckingQueueWhenNoFilehandlers: 5000
          // Default 5000ms / 5sec - no filehandlers defined yet, we wait? 0 disables
};

_queueListener = function(uploadsCollection) {
  var self = this;
  self._uploadsCollection = uploadsCollection;

  //Spawn worker:
  Meteor.setTimeout(function() {
    self.checkQueue();
  }, 0); //Init worker process

};//EO queueListener

_.extend(_queueListener.prototype, {
  checkQueue: function() {
    var self = this;
    //check items in queue and init workers for conversion
    if (self._uploadsCollection) {
      if (self._uploadsCollection._fileHandlers) {
        //ok got filehandler object, spawn worker?
        if (__filehandlerConfig.Running < __filehandlerConfig.MaxRunning) {
          __filehandlerConfig.Running++;

          // First, try to find new unhandled files
          var uploadRecord = self._uploadsCollection._collection.findOne({handledAt: null, complete: true});
          // Second, try to find new filehandlers, not yet applied
          if (!uploadRecord) {
            // Create a $or query array from filehandlers
            var queryFilehandlersExists = [];
            for (var fhName in self._uploadsCollection._fileHandlers) {
              var queryExists = {};
              queryExists['fileHandler.' + fhName] = {$exists: false};
              queryFilehandlersExists.push(queryExists);
            }

            //Where one of the fileHandlers are missing
            if (queryFilehandlersExists.length > 0) {
              uploadRecord = self._uploadsCollection._collection.findOne({
                complete: true,
                $or: queryFilehandlersExists
              });
            }
          } // EO try to find new filehandlers

          // Third, try to find failed filehanders
          if (!uploadRecord) {
            // Create a $or query array from filehandlers
            var queryFilehandlersExists = [];
            for (var fhName in self._uploadsCollection._fileHandlers) {
              var queryExists = {};
              queryExists['fileHandler.' + fhName + '.failures'] = {$gt: 0, $lt: __filehandlerConfig.MaxFailes};
              queryFilehandlersExists.push(queryExists);
            }

            //Where one of the fileHandlers has previously failed fewer than the maximum number of times
            if (queryFilehandlersExists.length > 0) {
              uploadRecord = self._uploadsCollection._collection.findOne({
                complete: true,
                $or: queryFilehandlersExists
              });
            }
          }

          // Handle file, spawn worker
          if (uploadRecord) {
            self.workFileHandlers(uploadRecord);
            // Update idle
            __filehandlerConfig._AllowFailesRetryLastTime = Date.now();
          } else {
            // We shouldn't get bored, are we going to retry failed filehandlers
            // or sleep a bit or eight?
            if (__filehandlerConfig.AllowFailesRetry) {
              var waitedEnough = ((__filehandlerConfig._AllowFailesRetryLastTime + __filehandlerConfig.AllowFailesRetry) < Date.now());
              // We wait a period before retrying
              if (waitedEnough) {
                for (var fhName in self._uploadsCollection._fileHandlers) {
                  // reset failed to 1 on all failed filehandlers, triggering a
                  // restart of failed retry
                  var queryFailed = {};
                  var querySetFailed = {};
                  queryFailed['fileHandler.' + fhName + '.failures'] = {$exists: true};
                  querySetFailed['fileHandler.' + fhName + '.failures'] = 1;
                  // We do reset pr. filehandler
                  self._uploadsCollection._collection.update(queryFailed, {$set: querySetFailed});
                }
              }  // EO for
            } // EO restart handling failed handlers?
          } // EO No fileRecord found

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
    } //No collection?? cant go on..
  }, //EO checkQueue

  workFileHandlers: function(uploadRecord) {
    var self = this;
    var fileHandlers = self._uploadsCollection._fileHandlers;

    // Load buffer into fileObject
    var fileObject = uploadRecord.toFileObject();
    if (fileObject.allChunksUploaded()) {
      fileObject.loadBuffer();
      fileObject.setId(void 0); //remove ._id so that it is not set when passed to file handler functions
    }
    
    if (!fileObject.buffer || fileObject.buffer.length === 0) {
      throw new Error("workFileHandlers: Failed to load buffer into fileObject");
    }
    
    var uploadRecordID = uploadRecord._id, someFailed = false;

      //loop through user-defined filehandler functions and execute them
      for (var fhName in fileHandlers) {
        // Is filehandler already found?
        var filehandlerFound = (uploadRecord.fileHandler && uploadRecord.fileHandler[fhName]);

        // Set sum of filehandler failures - if not found the default to 0
        var sumFailes = (filehandlerFound &&
                uploadRecord.fileHandler[fhName].failures) ?
                uploadRecord.fileHandler[fhName].failures : 0;

        // if not filehandler or filehandler found in fileRecord.fileHandlers
        // then check if failed
        if (!filehandlerFound || sumFailes < __filehandlerConfig.MaxFailes) {
          // We normalize filehandler data preparing it for the database
          // func is the filehandler name eg. "resize256"
          // fileData is the data to return from the file handler, eg. url and
          // extension
          var normalizeFilehandle = function(func, fileData) {
            var myData = {};
            myData['fileHandler.' + func] = fileData || {};
            myData['fileHandler.' + func].createdAt = Date.now();
            return myData;
          };

          //call the filehandler function
          var result = false;
          try {
            result = fileHandlers[fhName].put.apply(_.clone(fileObject));
          } catch (e) {
            throw new Error('Error in filehandler: "' + fhName + '" ' + (e.trace || e.message));
          }

          // if null returned then ok, don't run again - we update the db
          if (result === null) {
            self._uploadsCollection._collection.update({_id: uploadRecordID}, {
              $set: normalizeFilehandle(fhName)
            });
            continue;
          }

          // if false then we got an error - handled by the queue
          if (result === false) {
            // Do nothing, try again sometime later as defined by config policy
            self._uploadsCollection._collection.update({_id: uploadRecordID}, {
              $set: normalizeFilehandle(fhName, {failures: (sumFailes + 1)})
            });
            someFailed = true;
            continue;
          } //EO filehandling failed

          self._uploadsCollection._collection.update({_id: uploadRecordID}, {
            $set: normalizeFilehandle(fhName, result)
          });

        } // EO if already found or max failures reached
      } //EO Loop through fileHandler functions

      if (!someFailed) {
        //done running all filehandler functions for this file; remove all chunks from the temporary collection
        self._uploadsCollection._chunksCollection.remove({files_id: uploadRecordID});
      }

    //mark as handled in DB
    self._uploadsCollection._collection.update({_id: uploadRecordID}, {$set: {handledAt: Date.now()}});
  }
});//EO queueListener extend