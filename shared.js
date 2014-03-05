// Exported namespace
FS = {};

// namespace for adapters
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

// XXX: should this be exported?? Where is it used?
var idParse = function(id) {
  return '' + id;
};

/** @method _Utility.defaultZero
  * @param {Any} val Returns number or 0 if value is a falsy
  */
_Utility.defaultZero = function(val) {
  return +(val || 0);
};

_Utility.cloneFileUnit = function(unit) {
  if (_.isObject(unit) && !_.isArray(unit)) {
    var newUnit = {
      size: _Utility.defaultZero(unit.size)
    };
    if (unit._id) {
      newUnit._id = '' + unit._id;
    }
    if (unit.name) {
      newUnit.name = '' + unit.name;
    }
    if (unit.type) {
      newUnit.type = '' + unit.type;
    }
    if (unit.utime) {
      newUnit.utime = unit.utime;
    }
    if (unit.key) {
      newUnit.key = unit.key;
    }
    return newUnit;
  }
  return null;
};

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

FS.Utility.cloneFileRecord = function(rec) {
  var result = _Utility.cloneFileUnit(rec) || {};
  // Base reference
  result.collectionName = '' + rec.collectionName;
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

  if (_.isArray(rec.chunks)) {
    result.chunks = [];
    _.each(rec.chunks, function(chunk, i) {
      result.chunks[i] = {
        start: chunk.start
      };
      if (Meteor.isServer) {
        result.chunks[i].tempFile = chunk.tempFile;
      }
    });
  }

  return result;
};

FS.Utility.defaultCallback = function(err) {
  if (err)
    throw err;
};

FS.Utility.handleError = function(callback, err) {
  err = new Error(err);
  if (callback) {
    callback(err);
  } else {
    throw err;
  }
};

FS.Utility.binaryToBuffer = function(data) {
  var len = data.length;
  var buffer = new Buffer(len);
  for (var i = 0; i < len; i++) {
    buffer[i] = data[i];
  }
  return buffer;
};

FS.Utility.bufferToBinary = function(data) {
  var len = data.length;
  var binary = EJSON.newBinary(len);
  for (var i = 0; i < len; i++) {
    binary[i] = data[i];
  }
  return binary;
};

FS.Utility.connectionLogin = function(connection) {
  // We check if the accounts package is installed, since we depend on
  // `Meteor.userId()`
  if (typeof Accounts !== 'undefined') {
    // Monitor logout from main connection
    Meteor.startup(function() {
      Deps.autorun(function() {
        var userId = Meteor.userId();
        if (userId) {
          connection.onReconnect = function() {
            var token = Accounts._storedLoginToken();
            connection.apply('login', [{resume: token}], function(err, result) {
              !err && result && connection.setUserId(result.id);
            });
          };
        } else {
          connection.onReconnect = null;
          connection.setUserId(null);
        }
      });
    });

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

// Utility for iteration over files in event
// XXX: refactor into client-side only file
if (Meteor.isClient) {

  FS.Utility.eachFile = function(e, f) {
    var evt = (e.originalEvent || e);

    var files = evt.target.files;

    if (!files || files.length == 0)
      files = evt.dataTransfer.files;

    for (var i = 0; i < files.length; i++) {
      f(files[i], i);
    }
  };

}
