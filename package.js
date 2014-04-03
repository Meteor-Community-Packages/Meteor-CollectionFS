Package.describe({
  name: 'cfs-file',
  summary: 'CollectionFS, FS.File object'
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
    'check',
    'livedata',
    'mongo-livedata',
    'http',
    'data-man'
  ]);

  api.add_files([
    'fsFile-common.js'
  ], 'client');

  api.add_files([
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
    'tests/file-server-tests.js'
  ], 'server');

  api.add_files([
    'tests/file-client-tests.js'
  ], 'client');
});
