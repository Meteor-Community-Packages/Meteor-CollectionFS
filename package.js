Package.describe({
  summary: 'CollectionFS, add ddp and http accesspoint capability'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package', 'cfs-tempstore']);

  api.use(['ejson', 'underscore', 'check', 'http-methods']);

  api.add_files([
    'accessPoint.js'
  ], ['server', 'client']);
});

Package.on_test(function (api) {
  api.use('cfs-access-point');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/client-tests.js', 'server');
  api.add_files('tests/server-tests.js', 'client');
});
