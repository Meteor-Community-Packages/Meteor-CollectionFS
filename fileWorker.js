// TODO: Use power queue to handle throttling etc.
// Use observe to monitor changes and have it create tasks for the power queue
// to perform.

FileWorker = function() {
  var self = this;
  self.running = false;
};

FileWorker.prototype.start = function() {
  var self = this;
  if (!self.running) {
    self.running = true;
    self.checkForMissingCopies();
  }
};

FileWorker.prototype.stop = function() {
  var self = this;
  self.running = false;
};

// Note this does not currently use a queue. Everything is synchronous
// so it probably doesn't need to unless we want progress tracking?
// Also, if a queue is used, the queue task will have to call
// checkForMissingCopies when it's done, otherwise it will continually
// add functions to the queue for the same missing files while the 
// previous queue tasks are still running.
FileWorker.prototype.checkForMissingCopies = function() {
  var self = this;

  // Loop through all defined FS.Collection
  _.each(_collections, function(cfs, cfsName) {

    // Initialize a selector that will be used to identify files where all
    // requested copies are either successfully saved or have failed the
    // max number of times but still have chunks. The resulting selector
    // should be something like this:
    //
    // {
    //   $and: [
    //     {chunks: {$exists: true}},
    //     {
    //       $or: [
    //         {
    //           $and: [
    //             {
    //               'copies.copy1': {$ne: null}
    //             },
    //             {
    //               'copies.copy1': {$ne: false}
    //             }
    //           ]
    //         },
    //         {
    //           'failures.copies.copy1.doneTrying': true
    //         }
    //       ]
    //     },
    //     REPEATED FOR EACH COPY
    //   ]
    // }
    var tempSelector = {$and: [{chunks: {$exists: true}}]};

    // Loop through all defined copies for the FS.Collection
    for (var copyName in cfs.options.copies) {
      var selector = {};
      
      // Find missing copies, oldest first.
      // The collection handles the details of max tries and sets doneTrying.
      selector['failures.copies.' + copyName + '.count'] = {$gt: 0};
      selector['failures.copies.' + copyName + '.doneTrying'] = false;
      cfs.find(selector, {sort: [['failures.copies.' + copyName + '.firstAttempt', 'asc'], ['failures.copies.' + copyName + '.lastAttempt', 'asc']]}).forEach(function(fsFile) {
        console.log("FileWorker trying to save copy " + copyName + " for " + fsFile._id + " in " + cfs.name);
        cfs.saveCopies(fsFile, {missing: true});
      });

      // Build selector to be used after the loop
      // for finding completed files, for which temporary chunk files
      // can be removed.
      var copyCond = {$or: [{$and: []}]};
      var tempCond = {};
      tempCond["copies." + copyName] = {$ne: null};
      copyCond.$or[0].$and.push(tempCond);
      tempCond = {};
      tempCond["copies." + copyName] = {$ne: false};
      copyCond.$or[0].$and.push(tempCond);
      tempCond = {};
      tempCond['failures.copies.' + copyName + '.doneTrying'] = true;
      copyCond.$or.push(tempCond);
      tempSelector.$and.push(copyCond);
    }

    // Delete temp files that are no longer needed
    cfs.find(tempSelector).forEach(function(fsFile) {
      console.log('Delete TempStore for file id: ' + fsFile._id);
      TempStore.deleteChunks(fsFile);
    });

  });

  if (self.running) {
    // Check again every 5 seconds
    Meteor.setTimeout(function() {
      self.checkForMissingCopies();
    }, 5000);
  }
};

// This periodically attempts to save missing files for all FS.Collection
fileWorker = new FileWorker();
fileWorker.start();