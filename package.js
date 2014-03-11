Package.describe({
  name: 'cfs-access-point',
  summary: 'CollectionFS, add ddp and http accesspoint capability'
});

Package.on_use(function(api) {

  api.use([
    //CFS packages
    'cfs-base-package',
    'cfs-file',
    //Core packages
    'underscore',
    'check',
    'ejson',
    //Other packages
    'http-methods',
    'http-publish'
  ]);

  api.add_files([
    'access-point-common.js',
    'access-point-handlers.js',
    'access-point-server.js'
  ], 'server');

  api.add_files([
    'access-point-common.js',
    'access-point-client.js'
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
