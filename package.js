Package.describe({
  name: 'cfs:upload-http',
  version: '0.0.16',
  summary: 'CollectionFS, HTTP File Upload',
  git: 'https://github.com/CollectionFS/Meteor-cfs-upload-http.git'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    'cfs:base-package@0.0.26',
    'cfs:tempstore@0.0.2',
    'cfs:file@0.0.0',
    'cfs:access-point@0.1.40',
    'cfs:power-queue@0.0.1',
    'cfs:reactive-list@0.0.8'
  ]);

  api.addFiles([
    'http-call-client.js',
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
