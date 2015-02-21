Package.describe({
  name: 'cfs:gridfs',
  version: '0.0.27',
  summary: 'GridFS storage adapter for CollectionFS',
  git: 'https://github.com/CollectionFS/Meteor-cfs-gridfs.git'
});

Npm.depends({
  mongodb: '1.3.23',
  'gridfs-stream': '0.5.3'
  //'gridfs-locking-stream': '0.0.3'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use(['cfs:base-package@0.0.27', 'cfs:storage-adapter@0.1.1']);
  api.addFiles('gridfs.server.js', 'server');
  api.addFiles('gridfs.client.js', 'client');
});

Package.onTest(function(api) {
  api.use(['cfs:gridfs', 'test-helpers', 'tinytest'], 'server');
  api.addFiles('tests/server-tests.js', 'server');
  api.addFiles('tests/client-tests.js', 'client');
});
