Package.describe({
  summary: 'CollectionFS, add ddp and http accesspoint capability'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package', 'cfs-file']);

  api.use(['ejson', 'underscore', 'check', 'http-methods', 'http-publish']);

  api.add_files([
    'access-point-common.js',
    'access-point-server.js',
    'accessPoint.js' // move this stuff to another package
  ], 'server');
  
  api.add_files([
    'access-point-common.js',
    'access-point-client.js',
    'accessPoint.js' // move this stuff to another package
  ], 'client');
});

Package.on_test(function (api) {
  api.use(['collectionFS', 'cfs-gridfs']);
  api.use('test-helpers', 'server');
  api.use('http', 'client');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/client-tests.js', 'client');
  api.add_files('tests/server-tests.js', 'server');
});
