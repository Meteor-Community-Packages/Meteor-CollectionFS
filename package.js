Package.describe({
  name: 'cfs:worker',
  version: '0.0.0',
  summary: 'CollectionFS, file worker - handles file copies/versions'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use([
    'cfs:base-package@0.0.0',
    'cfs:tempstore@0.0.0',
    'cfs:storage-adapter@0.0.0'
  ]);

  api.use([
    'livedata',
    'mongo-livedata',
    'cfs:power-queue@0.0.0'
  ]);

  api.add_files([
    'fileWorker.js'
  ], 'server');
});

// Package.on_test(function (api) {
//   api.use('cfs:standard-packages@0.0.0');

//   api.use('test-helpers', 'server');
//   api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict', 'random']);

//   api.add_files('tests/client-tests.js', 'client');
//   api.add_files('tests/server-tests.js', 'server');
// });
