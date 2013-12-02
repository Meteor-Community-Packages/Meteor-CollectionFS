Package.describe({
  summary: "\u001b[32mv0.4.0 (under development)\n" +
          "\u001b[33m-----------------------------------------\n" +
          "\u001b[0m Filesystem for Meteor, collectionFS      \n" +
          "\u001b[0m                                          \n" +
          "\u001b[33m-------------------------------------RaiX\n"
});

Npm.depends({
  mmmagic: "0.3.4",
  tmp: "0.0.21"
});

Package.on_use(function(api) {
  "use strict";
  
  api.use(['deps', 'underscore', 'mongo-livedata', 'ejson', 'collection-hooks', 'http-methods', 'power-queue']);
  if (api.export) {
    api.export('FS');
  }
  
  api.add_files([
    'FileSaver.js',
    'shared.js',
    'argParser.js',
    'transferQueue.js',
    'fsFile/fsFile-common.js',
    'fsFile/fsFile-client.js',
    'fsFile/fsFile-ejson.js',
    'fsCollection.js'
  ], 'client');
  
  api.add_files([
    'shared.js',
    'argParser.js',
    'fsFile/fsFile-common.js',
    'fsFile/fsFile-server.js',
    'fsFile/fsFile-ejson.js',
    'storageAdapter.js',
    'fsCollection.js',
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
