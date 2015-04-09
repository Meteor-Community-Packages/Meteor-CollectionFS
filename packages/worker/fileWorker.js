/**
 * @public
 * @type Object
 */
FS.FileWorker = {};

/**
 * @method FS.FileWorker.observe
 * @public
 * @param {FS.Collection} fsCollection
 * @returns {undefined}
 *
 * Sets up observes on the fsCollection to store file copies and delete
 * temp files at the appropriate times.
 */

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

/**
 *  @method getDoneQuery
 *  @private
 *  @param {Array} stores - The stores array from the FS.Collection options
 *
 *  Returns a selector that will be used to identify files where all
 *  stores have successfully save or have failed the
 *  max number of times but still have chunks. The resulting selector
 *  should be something like this:
 *
 *  {
 *    $and: [
 *      {chunks: {$exists: true}},
 *      {
 *        $or: [
 *          {
 *            $and: [
 *              {
 *                'copies.storeName': {$ne: null}
 *              },
 *              {
 *                'copies.storeName': {$ne: false}
 *              }
 *            ]
 *          },
 *          {
 *            'failures.copies.storeName.doneTrying': true
 *          }
 *        ]
 *      },
 *      REPEATED FOR EACH STORE
 *    ]
 *  }
 *
 */
//function getDoneQuery(stores) {
//  var selector = {
//    $and: []
//  };
//
//  // Add conditions for all defined stores
//  FS.Utility.each(stores, function(store) {
//    var storeName = store.name;
//    var copyCond = {$or: [{$and: []}]};
//    var tempCond = {};
//    tempCond["copies." + storeName] = {$ne: null};
//    copyCond.$or[0].$and.push(tempCond);
//    tempCond = {};
//    tempCond["copies." + storeName] = {$ne: false};
//    copyCond.$or[0].$and.push(tempCond);
//    tempCond = {};
//    tempCond['failures.copies.' + storeName + '.doneTrying'] = true;
//    copyCond.$or.push(tempCond);
//    selector.$and.push(copyCond);
//  })
//
//  return selector;
//}