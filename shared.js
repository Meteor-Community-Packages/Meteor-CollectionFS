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
