function loadBuffer(fsFile, callback) {
  var fsFileClone = fsFile.clone();

  if (fsFile.hasData()) {
    fsFileClone.setDataFromBinary(fsFile.getBinary());
    callback(null, fsFileClone);
    return;
  }

  // If the supplied fsFile does not have a buffer loaded already,
  // try to load it from the temporary file.
  console.log("attempting to load buffer from temp file");
  TempStore.getDataForFile(fsFile, function (err, fsFileWithData) {
    if (err) {
      callback(err);
    } else {
      fsFileClone.setDataFromBinary(fsFileWithData.getBinary());
      callback(null, fsFileClone);
    }
  });
}

var loadBufferSync = Meteor._wrapAsync(loadBuffer);

function saveCopy(fsFile, store, beforeSave) {
  // Get a new copy and a fresh buffer each time in case beforeSave changes anything
  var fsFileClone = loadBufferSync(fsFile);

  // Call the beforeSave function provided by the user
  if (!beforeSave ||
          beforeSave.apply(fsFileClone) !== false) {
    var id = store.insert(fsFileClone);
    if (!id) {
      return null;
    } else {
      return {
        _id: id,
        name: fsFileClone.name,
        type: fsFileClone.type,
        size: fsFileClone.size,
        utime: fsFileClone.utime
      };
    }
  } else if (beforeSave) {
    //beforeSave returned false
    return false;
  }
}

// This function is called to create all copies or only missing copies. It may be safely
// called multiple times with the "missing" option set. It is synchronous.
FS.Collection.prototype.saveCopies = function(fsFile, options) {
  var self = this;
  options = options || {};

  // Loop through copies defined in CFS options
  _.each(self.options.copies, function(copyDefinition, copyName) {
    var copyInfo = fsFile.copies && fsFile.copies[copyName];
    // If copy has not already been saved or we want to overwrite it
    if (!options.missing || (copyInfo === void 0 && !fsFile.failedPermanently(copyName))) {
      console.log('creating copy ' + copyName);

      var result = saveCopy(fsFile, copyDefinition.store, copyDefinition.beforeSave);
      if (result === null) {
        // Temporary failure; let the fsFile log it and potentially decide
        // to give up.
        fsFile.logCopyFailure(copyName);
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
  });
};

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