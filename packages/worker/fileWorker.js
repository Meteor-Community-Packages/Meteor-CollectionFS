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
    //concurrency: 1,
    //cargo: 1,
    pollInterval: 1000000000, // Don't poll,
    //prefetch: 1
  },
  function (job, callback) {
    var fileObj = job.data.fileObj;
    var fsCollection = FS._collections[fileObj.collectionName];
    var fsFile = fsCollection.findOne(fileObj._id);
    FS.TempStore.removeFile(fsFile);
    job.done();
    // TODO: Work out how to handle failed jobs since there's no return value
    callback();
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
    var fileObj = EJSON.parse(job.data.fsFileString);
    var fsCollection = FS._collections[fileObj.collectionName];
    // Create an fsFile in memory from the serialised
    var fsFile = new FS.File(fileObj);
    //remove from temp store
    FS.TempStore.removeFile(fsFile);
    //delete from all stores
    FS.Utility.each(fsCollection.options.stores, function(storage) {
      storage.adapter.remove(fsFile);
    });
    // TODO: Handle success and failures properly
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

// TODO: Work out how to determine if the job is done or failed
function saveCopy(job, callback) {

  var fileObj = job.data.fileObj;
  var storeName = job.data.storeName;
  var options = job.data.options || {};
  var fsCollection = FS._collections[fileObj.collectionName];
  var fsFile = fsCollection.findOne(fileObj._id);

  var storage = FS.StorageAdapter(storeName);
  if (!storage) {
    throw new Error('No store named "' + storeName + '" exists');
    job.failed();
    callback();
  }

  FS.debug && console.log('saving to store ' + storeName);

  var writeStream = storage.adapter.createWriteStream(fsFile);
  var readStream = FS.TempStore.createReadStream(fsFile);

  // Pipe the temp data into the storage adapter
  readStream.pipe(writeStream);
  job.done();
  callback();
}