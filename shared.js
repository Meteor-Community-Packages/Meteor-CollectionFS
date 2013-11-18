// This is an internal collection reference
_collectionsFS = {};

// This utilizes a small event queue for syncron tasks
eventQueue = new PowerQueue('EventQueue');

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

/*
 * BEGIN ARGUMENT PARSER
 */

var typeNames = function(type) {
  if (Match.test(type, [Match.Any]))
    return 'array';
  if (type === Object)
    return 'object';
  if (type === String)
    return 'string';
  if (type === Number)
    return 'number';
  if (type === Boolean)
    return 'boolean';
  if (type === Function)
    return 'function';
  return typeof type;
};

// If arguments are correctly parsed then return the object
// otherwice we return the new Error() object - the user can then throw this
// if relevant
parseArguments = function(args, names, types) {
  // Names are array of strings or string in array
  check(names, [Match.OneOf(String, [String])]);
  check(types, [Match.Any]);
  check(args, [Match.Any]);
  // Check lengths, we throw this since this function needs this
  if (names.length !== types.length) {
    throw new RangeError("Names and types don't match");
  }

  // The returning result object
  var result = {}, t = 0, found, arg, type, name, argIsRequired;

  for (var a = 0; a < args.length; a++) {
    arg = args[a];
    found = false;
    while (!found && t < types.length) {
      type = types[t];
      name = names[t];
      argIsRequired = name === '' + name;
      if (Match.test(arg, type)) {
        if (typeof result[name] !== 'undefined') {
          throw new Error('Duplicate argument name: "' + name + '"');
        }
        // Set key and value on result
        result[name] = arg;
        found = true;
      } else {
        if (argIsRequired) {
          return new TypeError('type (' + typeNames(arg) +
                  ') did not match (' + typeNames(type) +
                  ') for required argument "' + name + '"');
        } else if (arg === null) {
          // It's OK for an optional argument to be null
          if (typeof result[name] !== 'undefined') {
            throw new Error('Duplicate argument name: "' + name + '"');
          }
          // Set key and value on result
          result[name] = arg;
          found = true;
        } else if (arg === void 0) {
          // It's OK for an optional argument to be undefined
          found = true;
        }
      }
      t++;
    }
  }

  // Done looping through supplied arguments.
  // Now check any remaining expected arguments to make sure none are required.
  while (t < types.length) {
    name = names[t];
    argIsRequired = name === '' + name;
    if (argIsRequired) {
      return new TypeError('required argument "' + name + '" is undefined');
    }
    t++;
  }

  return result;
};

/*
 * END ARGUMENT PARSER
 */

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