Package.describe({
  name: 'cfs-file',
  summary: 'CollectionFS, FS.File object'
});

Npm.depends({
  mime: "1.2.11",
  'simple-bufferstream': "0.0.4",
  temp: "0.7.0" // for tests only
});

Package.on_use(function(api) {

  // This imply is needed for tests, and is technically probably correct anyway.
  api.imply([
    'cfs-base-package'
  ]);

  api.use([
    'cfs-base-package',
    'cfs-storage-adapter',
    'deps',
    'underscore',
    'check',
    'livedata',
    'mongo-livedata',
    'http'
  ]);

  api.use(['cfs-filesaver'], 'client');

  api.add_files([
    'Blob.js', //polyfill for browsers without Blob constructor; currently necessary for phantomjs support, too
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

  api.use([
    'cfs-base-package',
    'cfs-file',
    'cfs-collection',
    'http-methods',
    'test-helpers',
    'tinytest',
    'underscore',
    'ejson',
    'ordered-dict',
    'random',
    'deps'
  ]);

  api.add_files([
    'tests/common.js',
    'tests/data-server-tests.js',
    'tests/file-server-tests.js'
  ], 'server');

  api.add_files([
    'tests/common.js',
    'tests/data-client-tests.js',
    'tests/file-client-tests.js'
  ], 'client');
});
