// Exported namespace
FS = {};

// namespace for adapters; XXX should this be added by cfs-storage-adapter pkg instead?
FS.Store = {};

// namespace for access points
FS.AccessPoint = {};

// namespace for utillities
FS.Utility = {};

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
 * @method FS.Utility.cloneFileRecord
 * @public
 * @param {FS.File|FS.Collection filerecord} rec
 * @returns {Object} Cloned filerecord
 *
 * Makes a shallow clone of `rec`, filtering out some properties that might be present if
 * it's an FS.File instance, but which we never want to be part of the stored
 * filerecord.
 *
 * This is a blacklist clone rather than a whitelist because we want the user to be able
 * to specify whatever additional properties they wish.
 *
 * In general, we expect the following whitelist properties used by the internal and
 * external APIs:
 *
 * _id, name, size, type, chunkCount, chunkSize, chunkSum, copies, createdAt, updatedAt, uploadedAt
 *
 * Those properties, and any additional properties added by the user, should be present
 * in the returned object, which is suitable for inserting into the backing collection or
 * extending an FS.File instance.
 *
 */
FS.Utility.cloneFileRecord = function(rec) {
  return _.omit(rec, ['collectionName', 'collection', 'data', 'createdByTransform']);
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
FS.Utility.defaultCallback = function defaultCallback(err) {
  if (err) {
    // Show gentle error if Meteor error
    if (err instanceof Meteor.Error) {
      console.error(err.message);
    } else {
      // Normal error, just throw error
      throw err;
    }

  }
};

/**
 * @method FS.Utility.defaultCallback
 * @public
 * @param {Function} [f] A callback function, if you have one. Can be undefined or null.
 * @param {Meteor.Error | Error | String} [err] Error or error message (string)
 * @returns {Any} the callback result if any
 *
 * Handle Error, creates an Error instance with the given text. If callback is
 * a function, passes the error to that function. Otherwise throws it. Useful
 * for dealing with errors in methods that optionally accept a callback.
 */
FS.Utility.handleError = function(f, err, result) {
  // Set callback
  var callback = (typeof f === 'function')? f : FS.Utility.defaultCallback;
  // Set the err
  var error = (err === ''+err)? new Error(err) : err;
  // callback
  return callback(error, result);
}

/**
 * @method FS.Utility.noop
 * @public
 * Use this to hand a no operation / empty function
 */
FS.Utility.noop = function() {};

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

/**
 * @method FS.Utility.getFileExtension
 * @private
 * @param {String} name - A filename or URL that may or may not have an extension.
 * @returns {String} The extension or an empty string if no extension found.
 */
FS.Utility.getFileExtension = function utilGetFileExtension(name) {
  // Seekout the last '.' if found
  var found = name.lastIndexOf('.') + 1;
  // Return the extension if found else ''
  return (found > 0 ? name.substr(found).toLowerCase() : '');
};

// Api wrap for 3party libs like underscore
FS.Utility.extend = _.extend;

FS.Utility.each = _.each;

FS.Utility.isEmpty = _.isEmpty;

FS.Utility.indexOf = _.indexOf;

FS.Utility.isArray = _.isArray;

FS.Utility.map = _.map;

FS.Utility.once = _.once;

FS.Utility.include = _.include;
