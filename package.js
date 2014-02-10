Package.describe({
  summary: "GridFS storage adapter for CollectionFS"
});

Package.on_use(function(api) {
  "use strict";
  api.use(['collectionFS']);
  api.add_files('gridfs.server.js', 'server');
  api.add_files('gridfs.client.js', 'client');
});

Package.on_test(function(api) {
  api.use(['cfs-gridfs', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests.js', 'server');
});