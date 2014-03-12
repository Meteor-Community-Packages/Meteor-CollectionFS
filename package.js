Package.describe({
  name: 'cfs-file',
  summary: 'CollectionFS, FS.File object'
});

Npm.depends({
  mime: "1.2.11",
  'simple-bufferstream': "0.0.4"
});

Package.on_use(function(api) {

  api.use(['cfs-base-package', 'cfs-storage-adapter']);

  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata' ]);

  api.use(['cfs-filesaver'], 'client');

  api.add_files([
    'fsData-common.js',
    'fsData-client.js',
    'fsFile-common.js'
  ], 'client');

  api.add_files([
    'fsData-common.js',
    'fsData-server.js',
    'fsFile-common.js',
    'fsFile-server.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
