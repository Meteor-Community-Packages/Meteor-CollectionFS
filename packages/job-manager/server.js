FS.JobManager.Config = {
  // Generate a server id or use the user defined
  //nodeId: Random.id(),

  // Jobs not persisted
  inMemoryJobs: ['tempStoreTransfer'],

  // If job persisted, remove after this period of time once completed
  //removeCompletedJobsAfter: msDay,

  // A task will die after default 1 day
  // This makes sure that tempstore is cleaned up and permenant failing tasks are
  // removed.
  //expire: msDay,

  // If a task fails we wait a while until its rerun default is 10 min
  // But tasks are sorted by failure and createdAt - so if a new file task is
  // added that goes before failed task - 10min is not a fixed interval its a
  // minimum time to wait until retry
  //sleep: 10 * msMin,

  // Limit the number of workers that may be processing simultaneously
  //limit: 1
};

FS.JobManager.register = function(fsCollection){
  var self = this;
  fsCollection.on('inserted', function(fsFile) {
    if(FS.Utility.indexOf(self.Config.inMemory, 'insert')){
      if(self.tempStoreTransferQueue.isTransferringFile(fsFile) || fsFile.hasStored('_tempstore')) return;
      FS.debug && console.log('JobManager:', fsFile._id,'inserted - creating tempStoreTransfer job in memory');
      self.tempStoreTransferQueue.transferFile(fsFile);
    } else {
      // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
      if(self.jobCollection.find({$and : [ {'type': 'tempStoreTransfer'}, {'data.fileObj._id': fsFile._id } ]}).count() > 0) return;
      FS.debug && console.log('JobManager:', fsFile._id,'inserted - creating tempStoreTransfer job');
      var job = new Job(self.jobCollection, 'tempStoreTransfer', {
        fileObj: {
          _id: fsFile._id,
          collectionName: fsFile.collectionName
        },
        //creator: {
        //  nodeId: self.Config.nodeId
        //}
      });
      job.priority('high').retry({wait: 0}).save();
    }
  });

  fsCollection.on('tempStoreTransferComplete', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(self.jobCollection.find({$and : [ {'type': 'saveCopy'}, {'data.fileObj._id': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log("JobManager: tempStoreTransferComplete for", fsFile._id);
    // Create a job for each store operation
    FS.Utility.each(this.storesLookup, function (store) {
      var storeName = store.name;
      FS.debug && console.log('JobManager: Creating saveCopy job for', fsFile._id, 'into store', storeName);
      var job = new Job(self.jobCollection, 'saveCopy', {
        fileObj: {
          _id: fsFile._id,
          collectionName: fsFile.collectionName
        },
        storeName: storeName,
        //creator: {
        //  nodeId: self.Config.nodeId
        //}
      });
      job.priority('medium').retry({wait: 0}).save();
    });
  });

  fsCollection.on('allStoresComplete', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(self.jobCollection.find({$and : [ {'type': 'removeTempFile'}, {'data.fileObj._id': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log('JobManager: allStoresComplete for', fsFile._id, '- creating removeTempFile job');
    var job = new Job(self.jobCollection, 'removeTempFile', {
      fileObj: {
        _id: fsFile._id,
        collectionName: fsFile.collectionName
      },
      //creator: {
      //  nodeId: self.Config.nodeId
      //}
    });
    job.priority('low').retry({wait: 0}).save();
  });

  fsCollection.on('removed', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(self.jobCollection.find({$and : [ {'type': 'removeStoredData'}, {'data.fileId': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log('JobManager:', fsFile._id, 'removed - creating removeStoredData job');
    var job = new Job(self.jobCollection, 'removeStoredData', {
      fsFileString: EJSON.stringify(fsFile),
      fileId: fsFile._id,
      //creator: {
      //  nodeId: self.Config.nodeId
      //}
    });
    job.priority('low').retry({wait: 0}).save();
  });

}

/**
 * @namespace FS
 * @type FS.TempStore.transferQueue
 *
 * Global tempStore transfer queue
 */
FS.JobManager.tempStoreTransferQueue = new FS.TempStore.transferQueue();

FS.JobManager.jobCollection.setLogStream(process.stdout);

FS.JobManager.jobCollection.startJobServer();