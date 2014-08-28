Package.describe({
  version: '0.0.0',
  summary: 'CollectionFS, add ddp and http accesspoint capability'
});

Package.on_use(function(api) {

  // This imply is needed for tests, and is technically probably correct anyway.
  api.imply([
    'cfs-base-package'
  ]);

  api.use([
    //CFS packages
    'cfs-base-package',
    'cfs-file',
    //Core packages
    'check',
    'ejson',
    //Other packages
    'http-methods',
    'http-publish'
  ]);

  api.add_files([
    'access-point-common.js',
    'access-point-handlers.js',
    'access-point-server.js'
  ], 'server');

  api.add_files([
    'access-point-common.js',
    'access-point-client.js'
  ], 'client');
});

Package.on_test(function (api) {

  api.use([
    //CFS packages
    'cfs-access-point',
    'collectionfs',
    'cfs-gridfs',
    //Core packages
    'test-helpers',
    'http',
    'tinytest',
    'underscore',
    'ejson',
    'ordered-dict',
    'random',
    'deps'
  ]);

  api.add_files('tests/client-tests.js', 'client');
  api.add_files('tests/server-tests.js', 'server');
});
