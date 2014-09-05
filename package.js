Package.describe({
  name: 'cfs:collection',
  version: '0.0.0',
  summary: 'CollectionFS, FS.Collection object'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use([
    // CFS
    'cfs:base-package@0.0.0',
    'cfs:tempstore@0.0.0',
    // Core
    'deps',
    'check',
    'livedata',
    'mongo-livedata',
    // Other
    'raix:eventemitter@0.0.1'
  ]);

  // Weak dependencies for uploaders
  api.use(['cfs:upload-http@0.0.0', 'cfs:upload-ddp@0.0.0'], { weak: true });

  api.add_files([
    'common.js',
    'api.common.js'
  ], 'client');

  api.add_files([
    'common.js',
    'api.common.js'
  ], 'server');
});

// Package.on_test(function (api) {
//   // api.use('collectionfs');
//   // api.use('test-helpers', 'server');
//   // api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
//   //          'random', 'deps']);
//   api.use(['collectionfs', 'cfs:gridfs@0.0.0', 'tinytest', 'underscore', 'test-helpers']);

//   api.add_files('tests/server-tests.js', 'server');
//   api.add_files('tests/client-tests.js', 'client');
// });
