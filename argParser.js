// This should probably be a separate package

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