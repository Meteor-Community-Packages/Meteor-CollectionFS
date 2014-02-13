//// TODO: Use power queue to handle throttling etc.
//// Use observe to monitor changes and have it create tasks for the power queue
//// to perform.

FS.FileWorker = {};

/**
 * Sets up observes on the fsCollection to store file copies and delete
 * temp files at the appropriate times.
 *
 * @param {FS.Collection} fsCollection
 * @returns {undefined}
 */
FS.FileWorker.observe = function(fsCollection) {

  // Initiate observe for finding newly uploaded/added files that need to be stored
  // per store.
  _.each(fsCollection.options.stores, function(store) {
    var storeName = store.name;
    fsCollection.files.find(getReadyQuery(storeName), {
      fields: {
        copies: 0
      }
    }).observe({
      added: function(fsFile) {
        // added will catch fresh files
        FS.debug && console.log("FileWorker ADDED - calling saveCopy", storeName, "for", fsFile._id);
        fsCollection.saveCopy(fsFile, storeName);
      },
      changed: function(fsFile) {
        // changed will catch failures and retry them
        FS.debug && console.log("FileWorker CHANGED - calling saveCopy", storeName, "for", fsFile._id);
        fsCollection.saveCopy(fsFile, storeName);
      }
    });
  });

  // Initiate observe for finding files that have been stored so we can delete
  // any temp files
  fsCollection.files.find(getDoneQuery(fsCollection.options.stores)).observe({
    added: function(fsFile) {
      FS.debug && console.log("FileWorker ADDED - calling deleteChunks for", fsFile._id);
      FS.TempStore.deleteChunks(fsFile);
    }
  });

  // Initiate observe for catching files that have been removed and
  // removing the data from all stores as well
  fsCollection.files.find().observe({
    removed: function(fsFile) {
      FS.debug && console.log('FileWorker REMOVED - removing all stored data for', fsFile._id);
      //delete from all stores
      _.each(fsCollection.options.stores, function(store) {
        store.remove(fsFile, {ignoreMissing: true});
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
 *    'copies.storeName`: null,
 *    'failures.copies.storeName.doneTrying': {$ne: true}
 *  }
 *
 *  @param {string} storeName - The name of the store to observe
 */
var getReadyQuery = function getReadyQuery(storeName) {
  var selector = {
    $where: "this.bytesUploaded === this.size",
    chunks: {$exists: true}
  };

  selector['copies.' + storeName] = null;
  selector['failures.copies.' + storeName + '.doneTrying'] = {$ne: true};

  return selector;
};

/**
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
 *  @param {Object} stores - The stores object from the FS.Collection options
 */
var getDoneQuery = function getDoneQuery(stores) {
  var selector = {
    $and: [
      {chunks: {$exists: true}}
    ]
  };

  // Add conditions for all defined stores
  for (var store in stores) {
    var storeName = store.name;
    var copyCond = {$or: [{$and: []}]};
    var tempCond = {};
    tempCond["copies." + storeName] = {$ne: null};
    copyCond.$or[0].$and.push(tempCond);
    tempCond = {};
    tempCond["copies." + storeName] = {$ne: false};
    copyCond.$or[0].$and.push(tempCond);
    tempCond = {};
    tempCond['failures.copies.' + storeName + '.doneTrying'] = true;
    copyCond.$or.push(tempCond);
    selector.$and.push(copyCond);
  }

  return selector;
};
