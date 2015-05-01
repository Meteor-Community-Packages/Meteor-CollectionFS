FS.JobManager.jobCollection.setLogStream(process.stdout);
FS.JobManager.jobCollection.startJobServer();

FS.JobManager.listen = function(fsCollection){

  fsCollection.on('tempStoreTransferComplete', function(fileObj, result) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    FS.debug && console.log("JobManager: tempStoreTransferComplete for", fileObj._id);
    // Create a job for each store operation
    FS.Utility.each(this.storesLookup, function (store) {
      var storeName = store.name;
      FS.debug && console.log("JobManager: Creating saveCopy job for", fileObj._id, "into store", storeName);
      var job = new Job(FS.JobManager.jobCollection, 'saveCopy', {
        fileObj: {
          _id: fileObj._id,
          collectionName: fileObj.collectionName
        },
        storeName: storeName
      });
      job.priority('medium').retry({wait: 0}).save();
    });
  });

  fsCollection.on('allStoresComplete', function(fileObj, storeName) {
    FS.debug && console.log("JobManager: allStoresComplete for", fileObj._id, '- creating removeTempFile job for', fileObj._id);
    var job = new Job(FS.JobManager.jobCollection, 'removeTempFile', {
      fileObj: {
        _id: fileObj._id,
        collectionName: fileObj.collectionName
      }
    });
    job.priority('low').retry({wait: 0}).save();
  });

}