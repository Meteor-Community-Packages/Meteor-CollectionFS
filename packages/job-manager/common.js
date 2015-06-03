/**
 * @public
 * @type Object
 */
FS.JobManager = {
  _registeredJobTypes: [],
  _registeredJobWorkers: []
};

// TODO: Allow custom options
FS.JobManager.jobCollection =  new JobCollection('cfs_jobManager');