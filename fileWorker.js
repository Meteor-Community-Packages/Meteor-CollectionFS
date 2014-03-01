//// TODO: Use power queue to handle throttling etc.
//// Use observe to monitor changes and have it create tasks for the power queue
//// to perform.

/**
 * @public
 * @type Object
 */
FS.FileWorker = {};

/**
 * @method FS.FileWorker.observe
 * @public
 * @param {FS.Collection} fsCollection
 * @returns {undefined}
 * 
 * Sets up observes on the fsCollection to store file copies and delete
 * temp files at the appropriate times.
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
        saveCopy(fsFile, storeName);
      },
      changed: function(fsFile) {
        // changed will catch failures and retry them
        FS.debug && console.log("FileWorker CHANGED - calling saveCopy", storeName, "for", fsFile._id);
        saveCopy(fsFile, storeName);
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
 *  @method getReadyQuery
 *  @private
 *  @param {string} storeName - The name of the store to observe
 *  
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
 */
function getReadyQuery(storeName) {
  var selector = {
    $where: "this.bytesUploaded === this.size",
    chunks: {$exists: true}
  };

  selector['copies.' + storeName] = null;
  selector['failures.copies.' + storeName + '.doneTrying'] = {$ne: true};

  return selector;
}

/**
 *  @method getDoneQuery
 *  @private
 *  @param {Object} stores - The stores object from the FS.Collection options
 * 
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
 */
function getDoneQuery(stores) {
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
}

/**
 * @method saveCopy
 * @private
 * @param {FS.File} fsFile
 * @param {string} storeName
 * @param {Object} options
 * @param {Boolean} [options.overwrite=false] - Force save to the specified store?
 * @returns {undefined}
 * 
 * Saves to the specified store. If the
 * `overwrite` option is `true`, will save to the store even if we already
 * have, potentially overwriting any previously saved data. Synchronous.
 */
function saveCopy(fsFile, storeName, options) {
  options = options || {};

  var store = FS.StorageAdapter(storeName);
  if (!store) {
    throw new Error('No store named "' + storeName + '" exists');
  }
  
  FS.debug && console.log('saving to store ' + storeName);
  
  // If the supplied fsFile does not have a buffer loaded already,
  // try to load it from the temporary file.
  if (!fsFile.hasData()) {
    fsFile = FS.TempStore.getDataForFileSync(fsFile);
  }
  
  var result;
  
  FS.debug && console.log('running beforeSave for store ' + storeName);
  
  // Call the beforeSave function provided by the user
  if (store.beforeSave) {
    // Get a new copy and a fresh buffer each time in case beforeSave changes anything
    fsFile = copyOfFileObjectWithData(fsFile);

    if (store.beforeSave.apply(fsFile) === false) {
      result = false;
    }
  }
  
  FS.debug && console.log('saving to store ' + storeName);
  
  // Save to store
  if (result !== false) {
    if (options.overwrite) {
      result = store.update(fsFile);
    } else {
      result = store.insert(fsFile);
    }
  }
  
  // Process result
  if (result === null) {
    FS.debug && console.log('saving to store ' + storeName + ' failed temporarily');
    // Temporary failure; let the fsFile log it and potentially decide
    // to give up.
    // TODO get rid of logCopyFailure and handle failures with powerqueue
    fsFile.logCopyFailure(storeName, store.options.maxTries);
  } else {
    if (result === false) {
      FS.debug && console.log('saving to store ' + storeName + ' failed permanently or was cancelled by beforeSave');
    } else {
      FS.debug && console.log('saving to store ' + storeName + ' succeeded');
    }
    // Update the main file object
    // result might be false, which indicates that this copy
    // should never be created in the future.
    var modifier = {};
    modifier["copies." + storeName] = result;
    // Update the main file object with the modifier
    fsFile.update({$set: modifier});
  }

}

function copyOfFileObjectWithData(fsFile) {
  var fsFileClone = fsFile.clone();
  fsFileClone.setDataFromBinary(fsFile.getBinary());
  return fsFileClone;
}