//// TODO: Use power queue to handle throttling etc.
//// Use observe to monitor changes and have it create tasks for the power queue
//// to perform.

FileWorker = {};

/**
 * Sets up observes on the fsCollection to store file copies and delete
 * temp files at the appropriate times.
 * 
 * @param {FS.Collection} fsCollection
 * @returns {undefined}
 */
FileWorker.observe = function(fsCollection) {

  // Initiate observe for finding newly uploaded/added files that need to be stored
  // per store.
  _.each(fsCollection.options.copies, function(copyDefinition, copyName) {
    fsCollection.files.find(getReadyQuery(copyName)).observe({
      added: function(fsFile) {
        // added will catch fresh files
        FS.debug && console.log("FileWorker ADDED - calling saveCopy", copyName, "for", fsFile._id);
        fsCollection.saveCopy(fsFile, copyName);
      },
      changed: function(fsFile) {
        // changed will catch failures and retry them
        FS.debug && console.log("FileWorker CHANGED - calling saveCopy", copyName, "for", fsFile._id);
        fsCollection.saveCopy(fsFile, copyName);
      }
    });
  });

  // Initiate observe for finding files that have been stored so we can delete
  // any temp files
  fsCollection.files.find(getDoneQuery(fsCollection.options.copies)).observe({
    added: function(fsFile) {
      FS.debug && console.log("FileWorker ADDED - calling deleteChunks for", fsFile._id);
      TempStore.deleteChunks(fsFile);
    }
  });

  // Initiate observe for catching files that have been removed and
  // removing the data from all stores as well
  fsCollection.files.find().observe({
    removed: function(fsFile) {
      FS.debug && console.log('FileWorker REMOVED - removing all stored data for', fsFile._id);
      //delete all copies
      _.each(fsCollection.options.copies, function(copyDefinition, copyName) {
        copyDefinition.store.remove(fsFile, {ignoreMissing: true, copyName: copyName});
      });
    }
  });
};

/**
 *  Returns a selector that will be used to identify files that
 *  have been uploaded but have not yet been stored to the
 *  specified store.
 *  
 *  {
 *    $where: "this.bytesUploaded === this.size",
 *    chunks: {$exists: true},
 *    'copies.copyName`: null,
 *    'failures.copies.copyName.doneTrying': {$ne: true}
 *  }
 *  
 *  @param {string} copyName - The name of the store to observe
 */
var getReadyQuery = function getReadyQuery(copyName) {
  var selector = {
    $where: "this.bytesUploaded === this.size",
    chunks: {$exists: true}
  };

  selector['copies.' + copyName] = null;
  selector['failures.copies.' + copyName + '.doneTrying'] = {$ne: true};

  return selector;
};

/**
 *  Returns a selector that will be used to identify files where all
 *  requested copies are either successfully saved or have failed the
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
 *                'copies.copy1': {$ne: null}
 *              },
 *              {
 *                'copies.copy1': {$ne: false}
 *              }
 *            ]
 *          },
 *          {
 *            'failures.copies.copy1.doneTrying': true
 *          }
 *        ]
 *      },
 *      REPEATED FOR EACH COPY
 *    ]
 *  }
 *  
 *  @param {Object} copies - The copies object from the FS.Collection options
 */
var getDoneQuery = function getDoneQuery(copies) {
  var selector = {
    $and: [
      {chunks: {$exists: true}}
    ]
  };

  // Add conditions for all defined copies
  for (var copyName in copies) {
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
    selector.$and.push(copyCond);
  }

  return selector;
};