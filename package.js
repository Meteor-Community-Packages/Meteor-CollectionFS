Package.describe({
  name: 'cfs:gridfs',
  version: '0.0.0',
  summary: 'GridFS storage adapter for CollectionFS'
});

Npm.depends({
  mongodb: '1.3.23',
  'gridfs-stream': '0.5.1'
  //'gridfs-locking-stream': '0.0.3'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use(['cfs:base-package@0.0.0', 'cfs:storage-adapter@0.0.0']);
  api.add_files('gridfs.server.js', 'server');
  api.add_files('gridfs.client.js', 'client');
});

Package.on_test(function(api) {
  api.use(['cfs:gridfs', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
