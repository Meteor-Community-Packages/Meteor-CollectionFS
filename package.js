Package.describe({
  name: "cfs-upload-http",
  summary: 'CollectionFS, HTTP File Upload'
});

Package.on_use(function(api) {

  api.use([
    'cfs-base-package',
    'cfs-tempstore',
    'cfs-file',
    'cfs-access-point',
    'power-queue',
    'reactive-list'
  ]);

  api.add_files([
    'http-call-client.js',
    'upload-http-common.js',
    'upload-http-client.js'
  ], 'client');

  api.add_files([
    'upload-http-common.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionfs');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
