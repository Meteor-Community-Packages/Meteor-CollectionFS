Package.describe({
  name: 'cfs-worker',
  summary: 'CollectionFS, file worker - handles file copies/versions'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package', 'cfs-tempstore']);

  api.use(['underscore', 'livedata', 'mongo-livedata', 'power-queue']);

  api.add_files([
    'fileWorker.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionFS');

  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict', 'random']);

  api.add_files('tests/client-tests.js', 'client');
  api.add_files('tests/server-tests.js', 'server');
});
