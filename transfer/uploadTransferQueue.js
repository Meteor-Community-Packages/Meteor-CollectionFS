/* 
 * Upload Transfer Queue
 */

var _taskHandler = function(task, next) {
  FS.debug && console.log("uploading chunk " + task.chunk + ", bytes " + task.start + " to " + Math.min(task.end, task.fileObj.size) + " of " + task.fileObj.size);
  task.fileObj.getBinary(task.start, task.end, function(err, data) {
    if (err) {
      next(err);
    } else {
      var b = new Date();
      task.connection.apply(task.methodName,
              [task.fileObj, data, task.start],
              { // We pass in options
                wait: false, // Dont queue this on the client
                onResultReceived: function(err, result) {
                  // This callback is called as soon as the data is recieved
                  var e = new Date();
                  FS.debug && console.log("server took " + (e.getTime() - b.getTime()) + "ms");
                  task = null;
                  next(err);
                }
              });
    }
  });

};

var _errorHandler = function(data, addTask) {
  // What to do if file upload failes - we could check connection and pause the
  // queue?
  //if (data.connection)
};

/** @method UploadTransferQueue
  * @namespace UploadTransferQueue
  * @private
  * @param {object} [options]
  * @param {object} [options.connection=new Meteor.connection]
  */
UploadTransferQueue = function(options) {
  // Rig options
  options = options || {};

  // Init the power queue
  var self = new PowerQueue({
    name: 'UploadTransferQueue',
    spinalQueue: ReactiveList,
    maxProcessing: 5,
    maxFailures: 5,
    jumpOnFailure: true,
    autostart: true,
    isPaused: false,
    filo: false
  });

  // Create a seperate ddp connection or use the passed in connection
  self.connection = options.connection || DDP.connect(Meteor.connection._stream.rawUrl);
  
  // Tie login for this connection to login for the main connection
  connectionLogin(self.connection);

  // Keep trak of uploaded files via this queue
  self.files = {};

  self.isUploadingFile = function(fileObj) {
    // Check if file is already in queue
    return !!(fileObj && fileObj._id && fileObj.collectionName && (self.files[fileObj.collectionName] || {})[fileObj._id]);
  };
  
  /** @method UploadTransferQueue.resumeUploadingFile
    * @param {FS.File} File to resume uploading
    * @todo Not sure if this is the best way to handle resumes
    */
  self.resumeUploadingFile = function (fileObj) {
    // Make sure we are handed a FS.File
    if (!(fileObj instanceof FS.File)) {
      throw new Error('Transfer queue expects a FS.File');
    }
    
    if (fileObj.isMounted()) {
      // This might still be true, preventing upload, if
      // there was a server restart without client restart.
      self.files[fileObj.collectionName] = self.files[fileObj.collectionName] || {};
      self.files[fileObj.collectionName][fileObj._id] = false;
      // Kick off normal upload
      self.uploadFile(fileObj);
    }
  };

  /** @method UploadTransferQueue.uploadFile
    * @param {FS.File} File to upload
    * @todo Check that a file can only be added once - maybe a visual helper on the FS.File?
    */
  self.uploadFile = function(fileObj) {
    // Make sure we are handed a FS.File
    if (!(fileObj instanceof FS.File)) {
      throw new Error('Transfer queue expects a FS.File');
    }

    // Make sure that we have size as number
    if (typeof fileObj.size !== 'number') {
      throw new Error('TransferQueue upload failed: fileObj size not set');
    }

    // We don't add the file if it's already in transfer or if already uploaded
    if (self.isUploadingFile(fileObj) || fileObj.isUploaded()) {
      return;
    }

    // Make sure the file object is mounted on a collection
    if (fileObj.isMounted()) {

      // Get the collection chunk size
      var chunkSize = fileObj.collection.options.chunkSize;
      
      // Calculate the number of chunks to upload
      var chunks = Math.ceil(fileObj.size / chunkSize);
      
      if (chunks === 0) return;

      // Create a sub queue
      var chunkQueue = new PowerQueue({
        onEnded: function () {
          // Remove from list of files being uploaded
          self.files[fileObj.collectionName][fileObj._id] = false;
        },
        spinalQueue: ReactiveList,
        maxProcessing: 5,
        maxFailures: 5,
        jumpOnFailure: true,
        autostart: true,
        isPaused: false,
        filo: false
      });

      // Rig the custom task handler
      chunkQueue.taskHandler = _taskHandler;

      // Rig the error handler
      chunkQueue.errorHandler = _errorHandler;

      // Rig methodName
      var methodName = fileObj.collection.methodName + '/put';

      // Set flag that this file is being transfered
      self.files[fileObj.collectionName] = self.files[fileObj.collectionName] || {};
      self.files[fileObj.collectionName][fileObj._id] = true;

      // Add chunk upload tasks
      for (var chunk = 0, start; chunk < chunks; chunk++) {
        start = chunk * chunkSize;
        if (! fileObj.chunkIsUploaded(start)) {
          // Create and add the task
          chunkQueue.add({
            chunk: chunk,
            name: fileObj.name,
            methodName: methodName,
            fileObj: fileObj,
            start: start,
            end: (chunk + 1) * chunkSize,
            connection: self.connection
          });
        }
      }

      // Add the queue to the main upload queue
      self.add(chunkQueue);
    }

  };

  return self;
};