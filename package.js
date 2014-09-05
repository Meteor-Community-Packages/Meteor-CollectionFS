Package.describe({
  name: 'cfs:upload-http',
  version: '0.0.0',
  summary: 'CollectionFS, HTTP File Upload'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use([
    'cfs:base-package@0.0.0',
    'cfs:tempstore@0.0.0',
    'cfs:file@0.0.0',
    'cfs:access-point@0.0.0',
    'cfs:power-queue@0.0.0',
    'cfs:reactive-list@0.0.0'
  ]);

  api.add_files([
    'http-call-client.js',
    'upload-http-common.js',
    'upload-http-client.js'
  ], 'client');

  api.add_files([
    'upload-http-common.js'
  ], 'server');
});

// Package.on_test(function (api) {
//   api.use('collectionfs');
//   api.use('test-helpers', 'server');
//   api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
//            'random', 'deps']);

//   api.add_files('tests/server-tests.js', 'server');
//   api.add_files('tests/client-tests.js', 'client');
// });
