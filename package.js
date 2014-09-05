Package.describe({
  name: 'cfs:access-point',
  version: '0.0.0',
  summary: 'CollectionFS, add ddp and http accesspoint capability'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  // This imply is needed for tests, and is technically probably correct anyway.
  api.imply([
    'cfs:base-package@0.0.0'
  ]);

  api.use([
    //CFS packages
    'cfs:base-package@0.0.0',
    'cfs:file@0.0.0',
    //Core packages
    'check',
    'ejson',
    //Other packages
    'cfs:http-methods@0.0.24',
    'cfs:http-publish@0.0.0'
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

// Package.on_test(function (api) {

//   api.use([
//     //CFS packages
//     'cfs:access-point@0.0.0',
//     'collectionfs',
//     'cfs:gridfs@0.0.0',
//     //Core packages
//     'test-helpers',
//     'http',
//     'tinytest',
//     'underscore',
//     'ejson',
//     'ordered-dict',
//     'random',
//     'deps'
//   ]);

//   api.add_files('tests/client-tests.js', 'client');
//   api.add_files('tests/server-tests.js', 'server');
// });
