Package.describe({
  summary: 'Filesystem for Meteor, collectionFS'
});

Npm.depends({
  mmmagic: "0.3.5",
  temp: "0.6.0"
});

Package.on_use(function(api) {
  "use strict";
  
  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata',
    'ejson', 'collection-hooks', 'http-methods', 'reactive-list', 'micro-queue', 'power-queue']);

  // Make a weak dependency to support Join for joining data
  api.use(['join'], { weak: true });
  
  if (api.export) {
    api.export('FS');
  }
  
  api.add_files([
    'FileSaver.js',
    'shared.js',
    'codeUtilities/argParser.js',
    'transfer/downloadTransferQueue.js',
    'transfer/uploadTransferQueue.js',
    'fsFile/fsFile-common.js',
    'fsFile/fsFile-data-get.js',
    'fsFile/fsFile-data-set.js',
    'fsFile/fsFile-client.js',
    'fsFile/fsFile-ejson.js',
    'fsCollection/common.js',
    'fsCollection/api.common.js',
    'fsCollection/api.client.js'
  ], 'client');
  
  api.add_files([
    'shared.js',
    'codeUtilities/argParser.js',
    'fsFile/fsFile-common.js',
    'fsFile/fsFile-data-get.js',
    'fsFile/fsFile-data-set.js',
    'fsFile/fsFile-server.js',
    'fsFile/fsFile-ejson.js',
    'storageAdapter.js',
    'tempStore.js',
    'accessPoint.js',
    'fsCollection/common.js',
    'fsCollection/api.common.js',
    'fsCollection/api.server.js',
    'fileWorker.js'
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
