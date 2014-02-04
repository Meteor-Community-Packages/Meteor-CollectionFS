function loadBuffer(fsFile, callback) {
  var fsFileClone = fsFile.clone();

  if (fsFile.hasData()) {
    FS.debug && console.log("TempStore: file has data; attempting to set data from binary");
    fsFileClone.setDataFromBinary(fsFile.getBinary());
    callback(null, fsFileClone);
    return;
  }

  // If the supplied fsFile does not have a buffer loaded already,
  // try to load it from the temporary file.
  FS.debug && console.log("TempStore: attempting to load buffer from temp file");
  TempStore.getDataForFile(fsFile, function(err, fsFileWithData) {
    if (err) {
      callback(err);
    } else {
      FS.debug && console.log("TempStore: attempting to set data from binary");
      fsFileClone.setDataFromBinary(fsFileWithData.getBinary());
      callback(null, fsFileClone);
    }
  });
}

var loadBufferSync = Meteor._wrapAsync(loadBuffer);

/**
 * Saves to the specified store. If the
 * `overwrite` option is `true`, will save to the store even if we already
 * have, potentially overwriting any previously saved data. Synchronous.
 * 
 * @param {FS.File} fsFile
 * @param {string} copyName
 * @param {Object} options
 * @param {Boolean} [options.overwrite=false] - Force save to the specified store?
 * @returns {undefined}
 */
FS.Collection.prototype.saveCopy = function(fsFile, copyName, options) {
  var self = this;
  options = options || {};
  var copyInfo = fsFile.copies && fsFile.copies[copyName];
  var copyDefinition = self.options.copies[copyName];

  // If copy has not already been saved or we want to overwrite it
  if (options.overwrite || (copyInfo === void 0 && !fsFile.failedPermanently(copyName))) {
    FS.debug && console.log('creating copy ' + copyName);

    var fsFileClone, result;

    // Get a new copy and a fresh buffer each time in case beforeSave changes anything
    try {
      fsFileClone = loadBufferSync(fsFile);
    } catch (err) {
      result = false;
    }

    // Call the beforeSave function provided by the user
    if (!copyDefinition.beforeSave ||
            copyDefinition.beforeSave.apply(fsFileClone) !== false) {
      var id = copyDefinition.store.insert(fsFileClone);
      if (!id) {
        result = null;
      } else {
        result = {
          _id: id,
          name: fsFileClone.name,
          type: fsFileClone.type,
          size: fsFileClone.size,
          utime: fsFileClone.utime
        };
      }
    } else if (copyDefinition.beforeSave) {
      //beforeSave returned false
      result = false;
    }

    if (result === null) {
      // Temporary failure; let the fsFile log it and potentially decide
      // to give up.
      fsFile.logCopyFailure(copyName, copyDefinition.maxTries);
    } else {
      // Update the main file object
      // copyInfo might be false, which indicates that this copy
      // should never be created in the future.
      var modifier = {};
      modifier["copies." + copyName] = result;
      // Update the main file object with the modifier
      fsFile.update({$set: modifier});
    }
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
  _.each(self.options.copies, function(copyDefinition, copyName) {
    self.saveCopy(fsFile, copyName, options);
  });
};

/**
 * Returns the store object given a copy name.
 * @param {string} copyName
 * @returns {FS.StorageAdapter} The store for this copy
 */
FS.Collection.prototype.getStoreForCopy = function(copyName) {
  var self = this;
  if (typeof copyName !== "string") {
    copyName = "_master";
  }
  if (typeof self.options.copies[copyName] !== "object" || self.options.copies[copyName] === null) {
    throw new Error('getStoreForCopy: copy "' + copyName + '" is not defined');
  }
  return self.options.copies[copyName].store;
};