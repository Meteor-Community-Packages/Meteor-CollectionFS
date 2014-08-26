Package.describe({
  name: 'cfs-collection',
  summary: 'CollectionFS, FS.Collection object'
});

Package.on_use(function(api) {
  api.use([
    // CFS
    'cfs-base-package',
    'cfs-tempstore',
    // Core
    'deps',
    'check',
    'livedata',
    'mongo-livedata',
    // Other
    'emitter'
  ]);

  // Weak dependencies for uploaders
  api.use(['cfs-upload-http', 'cfs-upload-ddp'], { weak: true });

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
  api.use(['collectionfs', 'cfs-gridfs', 'tinytest', 'underscore', 'test-helpers']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
