// Exported namespace
FS = {};

// An internal collection reference
_collections = {};

// A simple event queue for synchronous tasks
eventQueue = new PowerQueue('EventQueue');

if (Meteor.isServer) {
  fs = Npm.require('fs');
  path = Npm.require('path');
  tmp = Npm.require('temp');
}

// #############################################################################
//
// HELPERS
//
// #############################################################################

var idParse = function(id) {
  return '' + id;
};

var defaultZero = function(val) {
  return +(val || 0);
};

cloneFileUnit = function(unit) {
  if (_.isObject(unit)) {
    var newUnit = {
      size: defaultZero(unit.size)
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
    return newUnit;
  }
  return null;
};

cloneFileAttempt = function(attempt) {
  if (_.isObject(attempt)) {
    return {
      count: attempt.count,
      firstAttempt: attempt.firstAttempt,
      lastAttempt: attempt.lastAttempt,
      doneTrying: attempt.doneTrying
    };
  }
  return {};
};

cloneFileRecord = function(rec) {
  var result = cloneFileUnit(rec) || {};
  // Base reference
  result.collectionName = '' + rec.collectionName;
  result.bytesUploaded = defaultZero(rec.bytesUploaded);

  if (_.isObject(rec.metadata)) {
    result.metadata = rec.metadata;
  }

  // clone info about the copies in the stores
  if (!_.isEmpty(rec.copies)) {
    result.copies = {};
    _.each(rec.copies, function(value, key) {
      result.copies[key] = cloneFileUnit(value);
    });
  }

  // clone failures
  if (!_.isEmpty(rec.failures)) {
    result.failures = {};

    if (!_.isEmpty(rec.failures.copies)) {
      result.failures.copies = {};
      _.each(rec.failures.copies, function(value, key) {
        result.failures.copies[key] = cloneFileAttempt(value);
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

defaultCallback = function(err) {
  if (err)
    throw err;
};

handleError = function(callback, err) {
  err = new Error(err);
  if (callback) {
    callback(err);
  } else {
    throw err;
  }
};

binaryToBuffer = function(data) {
  var len = data.length;
  var buffer = new Buffer(len);
  for (var i = 0; i < len; i++) {
    buffer[i] = data[i];
  }
  return buffer;
};

bufferToBinary = function(data) {
  var len = data.length;
  var binary = EJSON.newBinary(len);
  for (var i = 0; i < len; i++) {
    binary[i] = data[i];
  }
  return binary;
};

connectionLogin = function(connection) {
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