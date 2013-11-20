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
  
  // Loop through all defined CollectionFS
  _.each(_collectionsFS, function(cfs, cfsName) {
    console.log("FileWorker checking for missing copies in the " + cfsName + " collection...");
    // First priority is missing master, oldest first.
    // The collection handles the details of max tries and sets doneTrying.
    cfs.find({'failures.master.count': {$gt: 0}, 'failures.master.doneTrying': false}, {sort: [['failures.master.firstAttempt', 'asc'], ['failures.master.lastAttempt', 'asc']]}).forEach(function(fileObject) {
      console.log("FileWorker trying to save master for " + fileObject._id + " in " + cfs.name);
      cfs.saveMaster(fileObject, {missing: true});
    });

    // Second priority is missing copies, oldest first, only if the master was saved.
    // The collection handles the details of max tries and sets doneTrying.
    for (var copyName in cfs.options.copies) {
      var selector = {'failures.master': null};
      selector['failures.copies.' + copyName + '.count'] = {$gt: 0};
      selector['failures.copies.' + copyName + '.doneTrying'] = false;
      cfs.find(selector, {sort: [['failures.copies.' + copyName + '.firstAttempt', 'asc'], ['failures.copies.' + copyName + '.lastAttempt', 'asc']]}).forEach(function(fileObject) {
        console.log("FileWorker trying to save copy " + copyName + " for " + fileObject._id + " in " + cfs.name);
        cfs.saveCopies(fileObject, {missing: true});
      });
    }
  });

  if (self.running) {
    // Check again every 5 seconds
    Meteor.setTimeout(function() {
      self.checkForMissingCopies();
    }, 5000);
  }
};

// This periodically attempts to save missing files for all collectionFS
fileWorker = new FileWorker();
fileWorker.start();