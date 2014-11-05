Package.describe({
  name: 'cfs:s3',
  version: '0.0.1',
  summary: "Amazon Web Services S3 storage adapter for CollectionFS",
  git: "https://github.com/CollectionFS/Meteor-cfs-s3.git"
});

Npm.depends({
  'aws-sdk': "2.0.23",
  // 'temp': '0.7.0', // used by the s3.indirect.streaming.js
  // 'through2': '0.4.1', // used by the s3.upload.stream.js
  // 'backoff': '2.3.0', // used by the s3.upload.stream.js
  // 'bl': '0.7.0' // used by the s3.upload.stream.js
});

Package.on_use(function(api) {
  api.use(['cfs:base-package@0.0.0', 'cfs:storage-adapter@0.0.0']);
  api.add_files([
    's3.server.js',
    // 's3.indirect.streaming.js',
    // 's3.upload.stream.js',
    's3.upload.stream2.js',
    ], 'server');
  api.add_files('s3.client.js', 'client');
});

Package.on_test(function(api) {
  api.use(['cfs:standard-packages', 'cfs:s3', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
