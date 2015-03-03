Package.describe({
  name: 'cfs:upload-http',
  version: '0.0.19',
  summary: 'CollectionFS, HTTP File Upload',
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    'cfs:base-package@0.0.27',
    'cfs:tempstore@0.1.3',
    'cfs:file@0.1.15',
    'cfs:access-point@0.1.43',
    'cfs:power-queue@0.9.11',
    'cfs:reactive-list@0.0.9',
    'aldeed:http'
  ]);

  api.addFiles([
    'upload-http-common.js',
    'upload-http-client.js'
  ], 'client');

  api.addFiles([
    'upload-http-common.js'
  ], 'server');
});

// Package.onTest(function (api) {
//   api.use('collectionfs');
//   api.use('test-helpers', 'server');
//   api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
//            'random', 'deps']);

//   api.addFiles('tests/server-tests.js', 'server');
//   api.addFiles('tests/client-tests.js', 'client');
// });
