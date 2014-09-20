Package.describe({
  name: 'cfs:collection',
  version: '0.0.1',
  summary: 'CollectionFS, FS.Collection object',
  git: 'https://github.com/CollectionFS/Meteor-cfs-collection.git'
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

Package.on_test(function (api) {
  api.use(['cfs:standard-packages', 'cfs:gridfs', 'tinytest', 'underscore', 'test-helpers']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
