#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

// For now this list is hardcoded - at some point we might want to autogenerate
// this list and exclude all dotnamed folders
var packageList = [
  'access-point',
  'collection',
  'data-man',
  'filesaver',
  'gridfs',
  'standard-packages',
  'tempstore',
  'worker',
  'base-package',
  'collection-filters ',
  'file',
  'filesystem',
  's3',
  'dropbox',
  'storage-adapter',
  'upload-http'
];

// We may not publish from within a Meteor app - so we workaround this by
// moving the .meteor folder to a temp location while publishing.
var tempfolder = 'packages/.tempQA';

// Task queue
var queue = [];

// Start next function in queue
var next = function() {
  var f = queue.shift();

  if (f) f();
};

// Alias start with next
var start = next;

// Add counters for stats
var counter = {
  error: 0,
  warning: 0,
  passed: 0
};

// Flags
var is = {
  patch: false,
  minor: false,
  major: false
};

// Packages to bump
var packagesToBump = {};

// Parse arguments
process.argv.slice(2).forEach(function (arg) {
  if (arg == '-M') {
    is.major = true;
  } else if (arg == '-m') {
    is.minor = true;
  } else {
    packagesToBump[arg] = true;
  }
});

// Set the patch flag
is.patch = !(is.major || is.minor);

// If no package is selected then bump all
if (Object.keys(packagesToBump).length == 0) {
  packageList.forEach(function(packageName) {
    packagesToBump[packageName] = true;
  });
}

// XXX: Remove
console.log(is, packagesToBump);

// TODO:
// 1. check if thers a local version that differs with the previous version -
//    if so we are already bumped. $meteor show cfs:file --ejson
//    read result.versions - pop the two last and check if theres a "local" set
//    true
// 2. bump the version accordingly to the flag -m -M
// 3. replace the version in the package and in all other package.js files - 
//    updating deps and marking these for a bump too...
// 4. continue until all deps are updated

// Report done
queue.push(function() {
  console.log('----');
  console.log('Bump done', (counter.warning)?', ' + counter.warning + ' warnings':'', (counter.error)?', ' + counter.error + ' errors':''  );
});

// Start the program
start();