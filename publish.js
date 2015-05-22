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

// List of binary packages
var binaryPackages = [
  'gridfs'
];

// Archs we want to build for
var buildForArchs = [
  'os.osx.x86_64',
  'os.linux.x86_64',
  'os.linux.x86_32',
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

// Move the app folder to temp location
queue.push(function() {
  console.log('Move QA app to temporary location while publishing');
  exec('mv .meteor/ ' + tempfolder, function(err, result) {
    next();
  });
});

// Publish packages
packageList.forEach(function(packageName) {

  queue.push(function() {
    // Do publish
    exec('cd packages/' + packageName + '; meteor publish', function(err, result) {
      if (err) {
        if (/already exists/.test(err)) {
          counter.warning++;
          console.log('"cfs:' + packageName + '" already published');
        } else {
          counter.error++;
          console.log('Error publishing "cfs:' + packageName + '", try publishing manually');
        }
      } else {
        // Print out log
        console.log(result);
      }
      exec('cd ../..', function() {
        next();
      });
    });
  });

});

// Move app back
queue.push(function() {
  console.log('Move QA app back from temporary location after publishing');
  exec('mv ' + tempfolder + ' .meteor', function(err, result) {
    next();
  });
});


// XXX: https://www.meteor.com/services/build We need to build binary packages
// for each arch - binaryPackages
// 
// # OS X
// meteor admin get-machine os.osx.x86_64

// # Linux on 64-bit Intel
// meteor admin get-machine os.linux.x86_64

// # Linux on 32-bit Intel
// meteor admin get-machine os.linux.x86_32

// Report done
queue.push(function() {
  console.log('----');
  console.log('Publish done', (counter.warning)?', ' + counter.warning + ' warnings':'', (counter.error)?', ' + counter.error + ' errors':''  );
});

start();