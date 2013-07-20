"use strict";

//utility functions
// Todo: should be transformed on to file objects?
getFileExtension = function(name) {
  var found = name.lastIndexOf('.') + 1;
  return (found > 0 ? name.substr(found) : "");
};

contentTypeInList = function(list, contentType) {
  var listType, found = false;
  for (var i = 0, ln = list.length; i < 10; i++) {
    listType = list[i]; // TODO: if i > ln
    if (listType === contentType) {
      found = true;
      break;
    }
    if (listType === "image/*" && contentType.indexOf("image/") === 0) {
      found = true;
      break;
    }
    if (listType === "audio/*" && contentType.indexOf("audio/") === 0) {
      found = true;
      break;
    }
    if (listType === "video/*" && contentType.indexOf("video/") === 0) {
      found = true;
      break;
    }
  }
  return found;
};

setObjByString = function(obj, str, val) {
  var keys, key;
  //make sure str is a nonempty string
  if (str === ''+str && str !== '') {
    return false;
  }
  if (!Match.test(obj, {})) {
    //if it's not an object, make it one
    obj = {};
  }
  keys = str.split(".");
  while (keys.length > 1) {
    key = keys.shift();
    if (obj !== Object(obj)) {
      //if it's not an object, make it one
      obj = {};
    }
    if (!(key in obj)) {
      //if obj doesn't contain the key, add it and set it to an empty object
      obj[key] = {};
    }
    obj = obj[key];
  }
  return obj[keys[0]] = val; // TODO: Are we checking or setting?
};

// TODO: Refractor code:
// use check(str, String); or Match.test(str, String);
isString = function() {
  throw Error('isString deprecated');
  // return Object.prototype.toString.call(str) === "[object String]";
};
/*
NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
}
*/

// TODO: refractor use: !!(check(str, String) && str.length > 0)
isNonEmptyString = function() {
  throw Error('isNonEmptyString deprecated');
  // return isString(str) && str.length;
};

// TODO: refractor to use: check(obj, Object)
isObject = function() {
  throw Error('isObject deprecated');
  // return obj === Object(obj);
};

var cleanOptions = function() {
  throw Error('cleanOptions deprecated');
  // return options;
};
