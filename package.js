Package.describe({
  summary: 'CollectionFS, file worker - handles file copies/versions'
});

// Npm.depends({
//   mime: "1.2.11",
//   temp: "0.6.0"
// });

Package.on_use(function(api) {


  api.use(['cfs-base-package', 'cfs-tempstore']);

  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata',
    'ejson', 'power-queue']);

  api.add_files([
    'fileWorker.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('cfs-worker');

  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/client-tests.js', 'server');
  api.add_files('tests/server-tests.js', 'client');
});
