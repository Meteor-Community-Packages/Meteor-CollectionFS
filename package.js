Package.describe({
  summary: 'CollectionFS, FS.Collection object'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package']);

  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata']);

  // Make a weak dependency to support Join for joining data
  api.use(['join'], { weak: true });

  api.add_files([
    'common.js',
    'api.common.js',
    'api.client.js'
  ], 'client');

  api.add_files([
    'common.js',
    'api.common.js',
    'api.server.js'
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
