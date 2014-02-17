/**
 * Saves to the specified store. If the
 * `overwrite` option is `true`, will save to the store even if we already
 * have, potentially overwriting any previously saved data. Synchronous.
 *
 * @param {FS.File} fsFile
 * @param {string} storeName
 * @param {Object} options
 * @param {Boolean} [options.overwrite=false] - Force save to the specified store?
 * @returns {undefined}
 */
FS.Collection.prototype.saveCopy = function(fsFile, storeName, options) {
  var self = this;
  options = options || {};

  var store = FS.StorageAdapter(storeName);
  if (!store) {
    throw new Error('saveCopy: No store named "' + storeName + '" exists');
  }
  
  FS.debug && console.log('saving to store ' + storeName);
  
  // If the supplied fsFile does not have a buffer loaded already,
  // try to load it from the temporary file.
  if (!fsFile.hasData()) {
    fsFile = FS.TempStore.getDataForFileSync(fsFile);
  }
  
  // Save to store
  var result;
  if (options.overwrite) {
    result = store.update(fsFile);
  } else {
    result = store.insert(fsFile);
  }
  
  // Process result
  if (result === null) {
    // Temporary failure; let the fsFile log it and potentially decide
    // to give up.
    fsFile.logCopyFailure(storeName, store.options.maxTries);
  } else {
    // Update the main file object
    // result might be false, which indicates that this copy
    // should never be created in the future.
    var modifier = {};
    modifier["copies." + storeName] = result;
    // Update the main file object with the modifier
    fsFile.update({$set: modifier});
  }

};

/**
 * Saves to any stores that data has not yet been saved to. If the
 * `overwrite` option is `true`, saves to all stores, potentially
 * overwriting any previously saved data. Synchronous.
 *
 * @param {FS.File} fsFile
 * @param {Object} options
 * @param {Boolean} [options.overwrite=false] - Force save to all defined stores?
 * @returns {undefined}
 */
FS.Collection.prototype.saveCopies = function(fsFile, options) {
  var self = this;

  // Loop through copies defined in CFS options
  _.each(self.options.stores, function(store) {
    self.saveCopy(fsFile, store.name, options);
  });
};
