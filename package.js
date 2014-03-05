Package.describe({
  name: 'cfs-collection',
  summary: 'CollectionFS, FS.Collection object'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package']);

  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata']);

  // Weak dependencies for uploaders
  api.use(['cfs-upload-http', 'cfs-upload-ddp'], { weak: true });

  api.add_files([
    'common.js',
    'api.common.js',
    'api.client.js'
  ], 'client');

  api.add_files([
    'common.js',
    'api.common.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
