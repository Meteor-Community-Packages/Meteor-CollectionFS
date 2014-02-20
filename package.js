Package.describe({
  summary: "Amazon Web Services S3 storage adapter for CollectionFS"
});

Npm.depends({
  'aws-sdk': "2.0.0-rc9"
});

Package.on_use(function(api) {
  api.use(['cfs-base-package', 'cfs-storage-adapter']);
  api.use(['underscore']);
  api.add_files('s3.server.js', 'server');
  api.add_files('s3.client.js', 'client');
});

Package.on_test(function(api) {
  api.use(['cfs-s3', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
