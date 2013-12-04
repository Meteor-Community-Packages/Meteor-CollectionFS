// Exported namespace
FS = {};

// An internal collection reference
_collections = {};

// A simple event queue for synchronous tasks
eventQueue = new PowerQueue('EventQueue');

if (Meteor.isServer) {
  fs = Npm.require('fs');
  path = Npm.require('path');
  tmp = Npm.require('tmp');
  mmm = Npm.require('mmmagic');
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

cloneFileRecord = function(rec) {
  var result = {
    // Base reference
    collectionName: '' + rec.collectionName,
    // Basic file stuff
    name: '' + rec.name,
    type: '' + rec.type,
    size: defaultZero(rec.size),
    utime: new Date(rec.utime),
    bytesUploaded: defaultZero(rec.bytesUploaded)
  };
  if (_.isObject(rec.metadata)) {
    result.metadata = rec.metadata;
  }
  // clone master
  if (_.isObject(rec.master)) {
    result.master = {
      _id: '' + rec.master._id,
      name: '' + rec.master.name,
      type: '' + rec.master.type,
      size: defaultZero(rec.master.size),
      utime: new Date(rec.master.utime)
    };
  }
  // clone copies
  if (_.isObject(rec.copies)) {
    result.copies = {};
    _.each(rec.copies, function(value, key) {
      if (_.isObject(value)) {
        result.copies['' + key] = {
          _id: '' + value._id,
          name: '' + value.name,
          type: '' + value.type,
          size: defaultZero(value.size),
          utime: new Date(value.utime)
        };
      }
    });
  }
  // clone failures
  if (_.isObject(rec.failures)) {
    result.failures = {};
    if (_.isObject(rec.failures.master)) {
      result.failures.master = {};
      result.failures.master.count = rec.failures.master.count;
      result.failures.master.firstAttempt = rec.failures.master.firstAttempt;
      result.failures.master.lastAttempt = rec.failures.master.lastAttempt;
      result.failures.master.doneTrying = rec.failures.master.doneTrying;
    }
    if (_.isObject(rec.failures.copies)) {
      result.failures.copies = {};
      _.each(rec.failures.copies, function(value, key) {
        result.failures.copies['' + key] = {};
        if (_.isObject(value)) {
          result.failures.copies['' + key].count = value.count;
          result.failures.copies['' + key].firstAttempt = value.firstAttempt;
          result.failures.copies['' + key].lastAttempt = value.lastAttempt;
          result.failures.copies['' + key].doneTrying = value.doneTrying;
        }
      });
    }
  }
  if (typeof rec._id !== 'undefined') {
    result._id = '' + rec._id;
  }
  if (Meteor.isServer && typeof rec.tempFile === 'string') {
    result.tempFile = rec.tempFile;
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