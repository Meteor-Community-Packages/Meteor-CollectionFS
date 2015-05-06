/**
 * @public
 * @type Object
 */
FS.FileWorker = {};

FS.FileWorker.saveCopyQueue = FS.JobManager.jobCollection.processJobs(
  'saveCopy',
  {
    //concurrency: 1,
    //cargo: 1,
    pollInterval: 1000000000, // Don't poll,
    //prefetch: 1
  },
  saveCopy
);

FS.JobManager.jobCollection.find({type: 'saveCopy', status: 'ready'}).observe({
  added: function(doc) {
    FS.debug && console.log("New saveCopy job", doc._id, "observed - calling worker");
    FS.FileWorker.saveCopyQueue.trigger();
  },
  changed: function(doc) {
    FS.debug && console.log("Existing saveCopy job", doc._id, "ready again - calling worker");
    FS.FileWorker.saveCopyQueue.trigger();
  }
});

FS.FileWorker.removeTempFileQueue = FS.JobManager.jobCollection.processJobs(
  'removeTempFile',
  {
    concurrency: 2,
    cargo: 2,
    pollInterval: 1000000000, // Don't poll,
    //prefetch: 2
  },
  function (job, callback) {
    var fsCollection = FS._collections[job.data.fileObj.collectionName];
    var fileObj = fsCollection.findOne(job.data.fileObj._id);

    if(FS.TempStore.removeFile(fileObj)){
      job.done();
      callback();
    } else {
      job.fail();
      callback();
    };

    Meteor.setTimeout(function(){
      job.fail();
      callback();
    }, 3600000);
  }
);

FS.JobManager.jobCollection.find({type: 'removeTempFile', status: 'ready'}).observe({
  added: function(doc) {
    FS.debug && console.log("New removeTempFile job", doc._id, "observed - calling worker");
    FS.FileWorker.removeTempFileQueue.trigger();
  },
  changed: function(doc) {
    FS.debug && console.log("Existing removeTempFile job", doc._id, "ready again - calling worker");
    FS.FileWorker.removeTempFileQueue.trigger();
  }
});

FS.FileWorker.removeStoredDataQueue = FS.JobManager.jobCollection.processJobs(
  'removeStoredData',
  {
    //concurrency: 1,
    //cargo: 1,
    pollInterval: 1000000000, // Don't poll,
    //prefetch: 1
  },
  function(job, callback){
    var fsCollection = FS._collections[job.data.fileObj.collectionName];
    // To track progress
    var subTaskCounter = 1;
    var subTaskTotal = 1 + fsCollection.options.stores.length;

    // Create an fsFile in memory from the de-serialised data
    var fileObj = new FS.File(EJSON.parse(job.data.fsFileString));

    Meteor.setTimeout(function(){
      job.fail();
      callback();
    }, 3600000);

    // 1. Remove from temp store
    if(FS.TempStore.removeFile(fileObj)){
      job.progress(subTaskCounter, subTaskTotal);
    } else {
      job.fail();
      callback();
    };

    subTaskCounter++;

    // 2. Delete from all stores
    FS.Utility.each(fsCollection.options.stores, function(storage) {
      if(storage.adapter.remove(fileObj)){
        job.progress(subTaskCounter, subTaskTotal)
      } else {
        job.fail();
        callback();
        throw new Error('File ' + fileObj._id + ' in ' + storage.storeName + ' could not be removed');
      };
      subTaskCounter++;
    });

    job.done();
    callback();
  }
);

FS.JobManager.jobCollection.find({type: 'removeStoredData', status: 'ready'}).observe({
  added: function(doc) {
    FS.debug && console.log("New removeStoredData job", doc._id, "observed - calling worker");
    FS.FileWorker.removeStoredDataQueue.trigger();
  },
  changed: function(doc) {
    FS.debug && console.log("Existing removeStoredData job", doc._id, "ready again - calling worker");
    FS.FileWorker.removeStoredDataQueue.trigger();
  }
});

/**
 * @method saveCopy
 * @private
 * @param {Job} job
 * @param {Boolean} [job.data.options.overwrite=false] - Force save to the specified store?
 * @param {Function} callback
 * @returns {undefined}
 *
 * Saves to the specified store. If the
 * `overwrite` option is `true`, will save to the store even if we already
 * have, potentially overwriting any previously saved data. Synchronous.
 */

function saveCopy(job, callback) {

  var storeName = job.data.storeName;
  var options = job.data.options || {};
  var fsCollection = FS._collections[job.data.fileObj.collectionName];
  var fileObj = fsCollection.findOne(job.data.fileObj._id);

  var storage = FS.StorageAdapter(storeName);
  if (!storage) {
    job.failed();
    callback();
    throw new Error('No store named "' + storeName + '" exists');
  }

  FS.debug && console.log('saving to store ' + storeName);

  var writeStream = storage.adapter.createWriteStream(fileObj);
  var readStream = FS.TempStore.createReadStream(fileObj);

  // Pipe the temp data into the storage adapter
  readStream.pipe(writeStream);

  Meteor.setTimeout(function() {
    FS.debug && console.log(fileObj._id, 'store stream timed out');
    job.fail();
    callback();
  }, 3600000);

  writeStream.safeOn('error', function(err) {
    job.fail();
    callback();
  });

  writeStream.safeOn('stored', function(){
    job.done();
    callback();
  });
}