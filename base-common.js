// Exported namespace
FS = {};

// namespace for adapters; XXX should this be added by cfs-storage-adapter pkg instead?
FS.Store = {};

// namespace for access points
FS.AccessPoint = {};

// namespace for utillities
FS.Utility = {};

// namespace for transform streams
FS.Transform = {};

// An internal collection reference
FS._collections = {};

// Test scope
_Utility = {};

// #############################################################################
//
// HELPERS
//
// #############################################################################

/** @method _Utility.defaultZero
 * @private
  * @param {Any} val Returns number or 0 if value is a falsy
  */
_Utility.defaultZero = function(val) {
  return +(val || 0);
};

/**
 * @method _Utility.cloneFileUnit
 * @private
 * @param {Object} unit
 * @returns {Object}
 */
_Utility.cloneFileUnit = function(unit) {
  if (_.isObject(unit) && !_.isArray(unit)) {
    var newUnit = {
      size: _Utility.defaultZero(unit.size)
    };
    _.each(['_id', 'name', 'type', 'key'], function (prop) {
      if (unit[prop]) {
        newUnit[prop] = '' + unit[prop];
      }
    });
    if (unit.utime) {
      newUnit.utime = unit.utime;
    }
    return newUnit;
  }
  return null;
};

/**
 * @method _Utility.cloneFileAttempt
 * @private
 * @param {Object} attempt
 * @returns {Object}
 */
_Utility.cloneFileAttempt = function(attempt) {
  if (_.isObject(attempt) && !_.isArray(attempt)) {
    return {
      count: attempt.count,
      firstAttempt: attempt.firstAttempt,
      lastAttempt: attempt.lastAttempt,
      doneTrying: attempt.doneTrying
    };
  }
  return {};
};

/**
 * @method FS.Utility.cloneFileRecord
 * @public
 * @param {FS.File|FS.Collection filerecord} rec
 * @returns {Object} Cloned filerecord
 */
FS.Utility.cloneFileRecord = function(rec) {
  var result = _Utility.cloneFileUnit(rec) || {};
  // Base reference
  if (rec.collectionName) {
    result.collectionName = '' + rec.collectionName;
  }
  // chunk ref
  if (rec.chunkSize != null) {
    result.chunkSize = rec.chunkSize;
  }
  // count for transfered chunks
  if (rec.chunkCount != null) {
    result.chunkCount = rec.chunkCount;
  }
  // count for transfered chunks
  if (rec.chunkSum != null) {
    result.chunkSum = rec.chunkSum;
  } else if (rec.size != null && rec.chunkSize != null) {
    result.chunkSum = Math.ceil(rec.size / rec.chunkSize);
  }

  // TODO Deprecate?
  result.bytesUploaded = _Utility.defaultZero(rec.bytesUploaded);

  if (_.isObject(rec.metadata)) {
    result.metadata = rec.metadata;
  }

  // clone info about the copies in the stores
  if (!_.isEmpty(rec.copies)) {
    result.copies = {};
    _.each(rec.copies, function(value, key) {
      result.copies[key] = _Utility.cloneFileUnit(value);
    });
  }

  // clone failures
  if (!_.isEmpty(rec.failures)) {
    result.failures = {};

    if (!_.isEmpty(rec.failures.copies)) {
      result.failures.copies = {};
      _.each(rec.failures.copies, function(value, key) {
        result.failures.copies[key] = _Utility.cloneFileAttempt(value);
      });
    }
  }

  return result;
};

/**
 * @method FS.Utility.defaultCallback
 * @public
 * @param {Error} [err]
 * @returns {undefined}
 *
 * Can be used as a default callback for client methods that need a callback.
 * Simply throws the provided error if there is one.
 */
FS.Utility.defaultCallback = function(err) {
  if (err)
    throw err;
};

/**
 * @method FS.Utility.handleError
 * @public
 * @param {Function} callback - A callback function, if you have one. Can be undefined or null.
 * @param {String} err - Error text
 * @returns {undefined}
 *
 * Creates an Error instance with the given text. If callback is a function,
 * passes the error to that function. Otherwise throws it. Useful for dealing
 * with errors in methods that optionally accept a callback.
 */
FS.Utility.handleError = function(callback, err) {
  err = new Error(err);
  if (callback) {
    callback(err);
  } else {
    throw err;
  }
};

/**
 * @method validateAction
 * @private
 * @param {Object} validators - The validators object to use, with `deny` and `allow` properties.
 * @param {FS.File} fileObj - Mounted or mountable file object to be passed to validators.
 * @param {String} userId - The ID of the user who is attempting the action.
 * @returns {undefined}
 *
 * Throws a "400-Bad Request" Meteor error if the file is not mounted or
 * a "400-Access denied" Meteor error if the action is not allowed.
 */
FS.Utility.validateAction = function validateAction(validators, fileObj, userId) {
  var denyValidators = validators.deny;
  var allowValidators = validators.allow;

  // If insecure package is used and there are no validators defined,
  // allow the action.
  if (typeof Package === 'object'
          && Package.insecure
          && denyValidators.length + allowValidators.length === 0) {
    return;
  }

  // Validators should receive a fileObj that is mounted
  if (!fileObj.isMounted()) {
    throw new Meteor.Error(400, "Bad Request");
  }

  // Validators should receive a fileObj that is fully populated
  fileObj.getFileRecord();

  // Any deny returns true means denied.
  if (_.any(denyValidators, function(validator) {
    return validator(userId, fileObj);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
  // Any allow returns true means proceed. Throw error if they all fail.
  if (_.all(allowValidators, function(validator) {
    return !validator(userId, fileObj);
  })) {
    throw new Meteor.Error(403, "Access denied");
  }
};
