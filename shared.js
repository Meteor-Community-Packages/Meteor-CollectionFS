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

cloneFileUnit = function(unit) {
  if (_.isObject(unit)) {
    var newUnit = {
      name: '' + unit.name,
      type: '' + unit.type,
      size: defaultZero(unit.size),
      utime: new Date(unit.utime)
    };
    if (unit._id)
      newUnit._id = '' + unit._id;
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
  var result = cloneFileUnit(rec);
  // Base reference
  result.collectionName = '' + rec.collectionName;
  result.bytesUploaded = defaultZero(rec.bytesUploaded);

  if (_.isObject(rec.metadata)) {
    result.metadata = rec.metadata;
  }

  // clone copies
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

  if (Meteor.isServer) {
    if (_.isArray(rec.chunks)) {
      result.chunks = [];
      _.each(rec.chunks, function(chunk, i) {
        result.chunks[i] = {
          start: chunk.start,
          tempFile: chunk.tempFile
        };
      });
    }
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