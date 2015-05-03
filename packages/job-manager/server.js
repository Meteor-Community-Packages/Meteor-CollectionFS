FS.JobManager.jobCollection.setLogStream(process.stdout);
FS.JobManager.jobCollection.startJobServer();

FS.JobManager.register = function(fsCollection){

  fsCollection.on('tempStoreTransferComplete', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(FS.JobManager.jobCollection.find({$and : [ {'type': 'saveCopy'}, {'data.fileObj._id': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log("JobManager: tempStoreTransferComplete for", fsFile._id);
    // Create a job for each store operation
    FS.Utility.each(this.storesLookup, function (store) {
      var storeName = store.name;
      FS.debug && console.log('JobManager: Creating saveCopy job for', fsFile._id, 'into store', storeName);
      var job = new Job(FS.JobManager.jobCollection, 'saveCopy', {
        fileObj: {
          _id: fsFile._id,
          collectionName: fsFile.collectionName
        },
        storeName: storeName
      });
      job.priority('medium').retry({wait: 0}).save();
    });
  });

  fsCollection.on('allStoresComplete', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(FS.JobManager.jobCollection.find({$and : [ {'type': 'removeTempFile'}, {'data.fileObj._id': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log('JobManager: allStoresComplete for', fsFile._id, '- creating removeTempFile job');
    var job = new Job(FS.JobManager.jobCollection, 'removeTempFile', {
      fileObj: {
        _id: fsFile._id,
        collectionName: fsFile.collectionName
      }
    });
    job.priority('low').retry({wait: 0}).save();
  });

  fsCollection.on('removed', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(FS.JobManager.jobCollection.find({$and : [ {'type': 'removeStoredData'}, {'data.fileId': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log('JobManager:', fsFile._id, 'removed - creating removeStoredData job');
    var job = new Job(FS.JobManager.jobCollection, 'removeStoredData', {
      fsFileString: EJSON.stringify(fsFile),
      fileId: fsFile._id
    });
    job.priority('low').retry({wait: 0}).save();
  });

}