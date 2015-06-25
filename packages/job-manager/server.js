if(FS.JobManager.jobCollection.find().count() === 0) {
  FS.JobManager.jobCollection._ensureIndex({'data.fileObj._id': 1});
  FS.debug && console.log('FS.JobManager.jobCollection indexes set');
}

FS.JobManager.jobCollection.setLogStream(process.stdout);

/**
 * @namespace FS
 * @type FS.TempStore.serverTransferQueue
 *
 * Global server in memory tempStore transfer queue
 */

FS.JobManager.tempStoreServerTransferQueue = new FS.TempStore.serverTransferQueue();

FS.JobManager.Config = {
  // Generate a server id or use the user defined
  nodeId: Random.id(),

  // Remove jobs from collection after this period of time once completed
  //removeCompletedJobsAfter: msDay,

  // A task will fail after 3 hours (Waiting for internal support https://github.com/vsivsi/meteor-job-collection/issues/86)
  autoFail: 10800000,

  // Number of workers that may be processing simultaneously
  concurrency: 2,
  // Number of jobs each worker is provided at one time. If > 1, job will be array
  payload: 1,
  // Used to reduce work request latency across slower networks
  prefetch: 0
};

FS.JobManager.register = function(fsCollection){
  var self = this;
  fsCollection.on('inserted', function(fsFile, source, processStartDate) {
    if(source !== 'server') return;
    if(FS.Utility.indexOf(FS.JobManager._registeredJobTypes, 'serverTempStoreTransfer') === -1){
      if(self.tempStoreServerTransferQueue.isTransferringFile(fsFile) || fsFile.hasStored('_tempstore')) return;
      FS.debug && console.log('JobManager:', fsFile._id,'inserted - creating serverTempStoreTransfer job in memory');
      self.tempStoreServerTransferQueue.transferFile(fsFile);
    } else {
      // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
      if(self.jobCollection.find({$and : [ {'type': 'serverTempStoreTransfer'}, {'data.fileId': fsFile._id } ]}).count() > 0) return;
      FS.debug && console.log('JobManager:', fsFile._id,'inserted - creating persistent serverTempStoreTransfer job');
      var job = new Job(self.jobCollection, 'serverTempStoreTransfer', {
        collectionName: fsFile.collectionName,
        fileId: fsFile._id,
        sourceId: self.Config.nodeId,
        processStartDate: processStartDate
      });
      job.priority('high').retry({retries: 20, wait: 0}).save();
    }
  });

  fsCollection.on('tempStoreTransferComplete', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(self.jobCollection.find({$and : [ {'type': 'saveCopy'}, {'data.fileId': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log("JobManager: tempStoreTransferComplete for", fsFile._id);
    // Create a job for each store operation
    FS.Utility.each(this.storesLookup, function (store) {
      var storeName = store.name;
      FS.debug && console.log('JobManager: Creating saveCopy job for', fsFile._id, 'into store', storeName);
      var job = new Job(self.jobCollection, 'saveCopy', {
        collectionName: fsFile.collectionName,
        fileId: fsFile._id,
        storeName: storeName,
        sourceId: self.Config.nodeId
      });
      job.priority('medium').retry({retries: 10, wait: 10, backoff: 'exponential'}).save();
    });
  });

  fsCollection.on('allStoresComplete', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(self.jobCollection.find({$and : [ {'type': 'removeTempFile'}, {'data.fileId': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log('JobManager: allStoresComplete for', fsFile._id, '- creating removeTempFile job');
    var job = new Job(self.jobCollection, 'removeTempFile', {
      collectionName: fsFile.collectionName,
      fileId: fsFile._id,
      sourceId: self.Config.nodeId
    });
    job.priority('low').retry({retries: 10, wait: 5000, backoff: 'constant'}).save();
  });

  fsCollection.on('removed', function(fsFile) {
    // TODO: Determine correct way to scope a collection event listener, as this currently fires for all collections
    if(self.jobCollection.find({$and : [ {'type': 'removeStoredData'}, {'data.fileId': fsFile._id } ]}).count() > 0) return;
    FS.debug && console.log('JobManager:', fsFile._id, 'removed - creating removeStoredData job');
    var job = new Job(self.jobCollection, 'removeStoredData', {
      collectionName: fsFile.collectionName,
      fileId: fsFile._id,
      fsFileString: EJSON.stringify(fsFile),
      sourceId: self.Config.nodeId
    });
    job.priority('low').retry({retries: 10, wait: 5000, backoff: 'exponential'}).save();
  });
}

FS.JobManager.registerJob = function(type, workerFunction){
  // Todo: Add checks
  var jobWorkers = {
    type: type,
    workerFunction: workerFunction
  }

  FS.JobManager._registeredJobTypes.push(type);
  FS.JobManager._registeredJobWorkers.push(jobWorkers);

}

FS.JobManager.Queue = FS.JobManager.jobCollection.processJobs(
  FS.JobManager._registeredJobTypes,
  {
    concurrency: FS.JobManager.Config.concurrency,
    payload: FS.JobManager.Config.payload,
    pollInterval: 1000000000, // Don't poll,
    prefetch: FS.JobManager.Config.prefetch
  },
  function(job, callback){
    FS.Utility.each(FS.JobManager._registeredJobWorkers, function(registeredJobWorker){
      if(job.type == registeredJobWorker.type) {
        var fsFile;
        var data = job.data;
        var fsCollection = FS._collections[data.collectionName];

        if(data.fsFileString) {
          // Create an fsFile in memory from the de-serialised data
          fsFile = new FS.File(EJSON.parse(data.fsFileString));
        } else {
          fsFile = fsCollection.findOne(data.fileId);
        }

        registeredJobWorker.workerFunction.apply(this, [fsFile, fsCollection, job]);

        callback();
      }
    });
  }
);

Meteor.startup(function(){

  FS.JobManager.jobCollection.startJobServer();

  FS.JobManager.jobCollection.find({type: { $in: FS.JobManager._registeredJobTypes}, status: 'ready'}).observe({
    added: function(doc) {
      FS.debug && console.log("New", doc.type, "job", doc._id, "observed - calling worker");
      FS.JobManager.Queue.trigger();
    },
    changed: function(doc) {
      FS.debug && console.log("Existing", doc.type, "job", doc._id, "ready again - calling worker");
      FS.JobManager.Queue.trigger();
    }
  });

})