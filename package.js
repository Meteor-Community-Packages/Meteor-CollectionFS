Package.describe({
  summary: 'CollectionFS, Class for creating Storage adapters'
});

Package.on_use(function(api) {
  api.use([
    'cfs-base-package'
  ]);

  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata',
    'ejson']);

  api.add_files([
    'storageAdapter.client.js'
  ], 'client');

  api.add_files([
    'storageAdapter.server.js',
    'transform.server.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('cfs-storage-adapter');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
