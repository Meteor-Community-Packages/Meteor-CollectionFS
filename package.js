Package.describe({
  summary: "Amazon Web Services S3 storage adapter for CollectionFS"
});

Npm.depends({
  knox: "0.8.6"
});

Package.on_use(function(api) {
  "use strict";
  api.use(['collectionFS']);
  api.add_files('s3.server.js', 'server');
  api.add_files('s3.client.js', 'client');
});

Package.on_test(function(api) {
  api.use(['cfs-s3', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests.js', 'server');
});