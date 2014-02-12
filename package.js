Package.describe({
  summary: 'CollectionFS, add ddp and http accesspoint capability'
});

Package.on_use(function(api) {
  api.use('cfs-base-package');

  // XXX: Check these...
  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata' ]);

  api.use(['ejson', 'http-methods']);


  api.add_files([
    'accessPoint.js',
  ], 'server');
});

Package.on_test(function (api) {
  api.use('cfs-access-point');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/client-tests.js', 'server');
  api.add_files('tests/server-tests.js', 'client');
});
