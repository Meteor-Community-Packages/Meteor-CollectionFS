Package.describe({
  summary: 'Filesystem for Meteor, collectionFS'
});

Npm.depends({
  mime: "1.2.11",
  temp: "0.6.0"
});

Package.on_use(function(api) {
  "use strict";
  
  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata',
    'ejson', 'http-methods', 'reactive-list', 'micro-queue', 'power-queue']);

  // Make a weak dependency to support Join for joining data
  api.use(['join'], { weak: true });
  
  if (api.export) {
    api.export('FS');
  }
  
  api.add_files([
    'FileSaver.js',
    'generalCode/shared.js',
    'codeUtilities/argParser.js',
    'transfer/downloadTransferQueue.js',
    'transfer/uploadTransferQueue.js',
    'fsFile/fsFile-common.js',
    'fsFile/fsFile-data-get.js',
    'fsFile/fsFile-data-set.js',
    'fsFile/fsFile-client.js',
    'fsFile/fsFile-ejson.js',
    'fsStorageAdapter/storageAdapter.client.js',
    'fsCollection/common.js',
    'fsCollection/api.common.js',
    'fsCollection/api.client.js'
  ], 'client');
  
  api.add_files([
    'generalCode/shared.js',
    'codeUtilities/argParser.js',
    'fsFile/fsFile-common.js',
    'fsFile/fsFile-data-get.js',
    'fsFile/fsFile-data-set.js',
    'fsFile/fsFile-server.js',
    'fsFile/fsFile-ejson.js',
    'fsStorageAdapter/storageAdapter.server.js',
    'tempStore.js',
    'fsAccessPoint/accessPoint.js',
    'fsCollection/common.js',
    'fsCollection/api.common.js',
    'fsCollection/api.server.js',
    'fsWorker/fileWorker.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/client-tests.js', 'server');
  api.add_files('tests/server-tests.js', 'client');
});
