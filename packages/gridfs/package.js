Package.describe({
  name: 'cfs:gridfs',
  version: '0.0.29',
  summary: 'GridFS storage adapter for CollectionFS',
  git: 'https://github.com/CollectionFS/Meteor-CollectionFS.git'
});

Npm.depends({
  mongodb: '1.3.23',
  'gridfs-stream': '0.5.3'
  //'gridfs-locking-stream': '0.0.3'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use(['cfs:base-package@0.0.27', 'cfs:storage-adapter@0.1.1']);
  api.addFiles('packages/gridfs/gridfs.server.js', 'server');
  api.addFiles('packages/gridfs/gridfs.client.js', 'client');
});

Package.onTest(function(api) {
  api.use(['cfs:gridfs', 'test-helpers', 'tinytest'], 'server');
  api.addFiles('packages/gridfs/tests/server-tests.js', 'server');
  api.addFiles('packages/gridfs/tests/client-tests.js', 'client');
});
