/**
 * @public
 * @type Object
 */
FS.FileWorker = {};

//FS.FileWorker.Queue = FS.JobManager.jobCollection.processJobs(
//  [
//    'saveCopy',
//    'removeTempFile',
//    'removeStoredData'
//  ],
//  {
//    concurrency: 2,
//    cargo: 2,
//    pollInterval: 1000000000 // Don't poll,
//    //prefetch: 2
//  },
//  function (job, callback) {
//    var data = job.data;
//    var fsCollection = FS._collections[data.collectionName];
//
//    if(data.fsFileString) {
//      // Create an fsFile in memory from the de-serialised data
//      var fsFile = new FS.File(EJSON.parse(data.fsFileString));
//    } else {
//      var fsFile = fsCollection.findOne(data.fileId);
//    }
//    //var jobTimeout = Meteor.setTimeout(function(){
//    //  job.fail();
//    //  callback();
//    //}, 3600000);
//
//    switch (job.type) {
//      case 'saveCopy':
//        saveCopy(fsFile, fsCollection, job);
//        break;
//      case 'removeTempFile':
//        //if(FS.TempStore.removeFile(fsFile)){
//        //  job.done();
//        //} else {
//        //  job.fail();
//        //};
//        removeTempFile(fsFile, fsCollection, job)
//        break;
//      case 'removeStoredData':
//        removeStoredData(fsFile, fsCollection.storesLookup, job);
//        break;
//    }
//
//    //Meteor.clearTimeout(jobTimeout);
//    callback();
//  }
//);

//FS.JobManager.jobCollection.find({type: { $in: ['saveCopy','removeTempFile','removeStoredData']}, status: 'ready'}).observe({
//  added: function(doc) {
//    FS.debug && console.log("New " + doc.type + " job", doc._id, "observed - calling worker");
//    FS.FileWorker.Queue.trigger();
//  },
//  changed: function(doc) {
//    FS.debug && console.log("Existing saveCopy job", doc._id, "ready again - calling worker");
//    FS.FileWorker.Queue.trigger();
//  }
//});

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

function saveCopy(fsFile, fsCollection, job) {

  var storeName = job.data.storeName;

  var storage = FS.StorageAdapter(storeName);
  if (!storage) {
    job.failed();
    return
    //throw new Error('No store named "' + storeName + '" exists');
  }

  FS.debug && console.log('saving to store ' + storeName);

  var writeStream = storage.adapter.createWriteStream(fsFile);
  var readStream = FS.TempStore.createReadStream(fsFile);

  // Pipe the temp data into the storage adapter
  readStream.pipe(writeStream);

  writeStream.safeOn('error', function(err) {
    job.fail();
  });

  writeStream.safeOn('stored', function(){
    job.done();
  });
}

function removeTempFile(fsFile, fsCollection, job){
  if(FS.TempStore.removeFile(fsFile)){
    job.done();
  } else {
    job.fail();
  };
}


/**
 * @method removeStoredData
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

function removeStoredData(fsFile, fsCollection, job) {
  // To track progress
  var subTaskCounter = 1;
  var subTaskTotal = 1 + fsCollection.options.stores.length;

  // 1. Remove from temp store
  if(FS.TempStore.removeFile(fsFile)) {
    job.progress(subTaskCounter, subTaskTotal);
  } else {
    job.fail();
  }

  subTaskCounter++;

  // 2. Delete from all stores
  FS.Utility.each(fsCollection.storesLookup, function (storage) {
    if(storage.adapter.remove(fsFile)) {
      job.progress(subTaskCounter, subTaskTotal)
    } else {
      job.fail();
      //throw new Error('File ' + fileObj._id + ' in ' + storage.storeName + ' could not be removed');
    }
    ;
    subTaskCounter++;
  });

  job.done();
}

FS.JobManager && FS.JobManager.registerJob('saveCopy',saveCopy);

FS.JobManager && FS.JobManager.registerJob('removeTempFile',removeTempFile)

FS.JobManager && FS.JobManager.registerJob('removeStoredData',removeStoredData);
