/**
 * @public
 * @type Object
 */
FS.FileWorker = {};

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
    job.fail({ reason: 'No store named ' + storeName + ' exists', code: 1 }, function (error, result) {
      if (error) {
        throw new Error('Could not fail FS.JobManager.jobCollection job: ' + job._doc._id);
      }
    });
    return
  } else {
    job.log('Storage Adaptor rigged', { level: 'info', echo: FS.debug || false }, function (error, result) {
      if(error)
        throw new Error('Could not add log to FS.JobManager.jobCollection job: ' + job._doc._id);
    });
  }

  var tempStore = FS.TempStore.createReadStream(fsFile);
  var destination = storage.adapter.createWriteStream(fsFile);

  tempStore.pipe(destination);

  job.log('Stream piping started', { level: 'info', echo: FS.debug || false }, function (error, result) {
    if(error)
      throw new Error('Could not add log to FS.JobManager.jobCollection job: ' + job._doc._id);
  });

  destination.on('error', function(error) {
    job.fail({ reason: 'Error piping ' + fsFile._id + ' from TempStore to ' + storeName , readStream: tempStore, writeStream: destination, code: 2}, function (error, result) {
      if (error) {
        throw new Error('Could not fail FS.JobManager.jobCollection job: ' + job._doc._id);
      }
    });
  });

  destination.safeOn('stored', function(){
    job.done(fsFile._id + ' stored in ' + storeName);
  });
}

function removeTempFile(fsFile, fsCollection, job){
  if(FS.TempStore.removeFile(fsFile)){
    job.done(fsFile._id + ' removed from TempStore');
  } else {
    job.fail({ reason: 'File ' + fsFile._id + ' could not be removed from TempStore', code: 2}, function (error, result) {
      if (error) {
        throw new Error('Could not fail FS.JobManager.jobCollection job: ' + job._doc._id);
      }
    });
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

  // 1. Remove from temp store if it exists
  if(FS.TempStore.exists(fsFile) && !FS.TempStore.removeFile(fsFile)) {
    job.fail({ reason: 'File ' + fsFile._id + ' could not be removed from TempStore', code: 2}, function (error, result) {
      if (error) {
        throw new Error('Could not fail FS.JobManager.jobCollection job: ' + job._doc._id);
      }
    });
  } else {
    job.progress(subTaskCounter, subTaskTotal, { echo: FS.debug || false }, function (error, result) {
      if (error) {
        throw new Error('Could not update progress of FS.JobManager.jobCollection job: ' + job._doc._id);
      }
    });
    subTaskCounter++;

    // 2. Delete from all stores
    FS.Utility.each(fsCollection.storesLookup, function (storage) {
      if(storage.adapter.remove(fsFile)) {
        job.progress(subTaskCounter, subTaskTotal, { echo: FS.debug || false }, function (error, result) {
          if (error) {
            throw new Error('Could not update progress of FS.JobManager.jobCollection job: ' + job._doc._id);
          }
        });
      } else {
        job.fail({ reason: 'File ' + fsFile._id + ' in ' + storage.storeName + ' could not be removed', code: 3}, function (error, result) {
          if (error) {
            throw new Error('Could not fail FS.JobManager.jobCollection job: ' + job._doc._id);
          }
        });
      }
      subTaskCounter++;
    });
    job.done('All data removed for ' + fsFile._id);
  }
}

FS.JobManager && FS.JobManager.registerJob('saveCopy',saveCopy);

FS.JobManager && FS.JobManager.registerJob('removeTempFile',removeTempFile)

FS.JobManager && FS.JobManager.registerJob('removeStoredData',removeStoredData);
