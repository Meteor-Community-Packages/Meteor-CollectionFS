Package.describe({
  name: 'cfs:filesystem',
  version: '0.0.0',
  summary: "Filesystem storage adapter for CollectionFS"
});

Npm.depends({
  //chokidar: "0.8.2",
  mkdirp: "0.3.5"
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use(['cfs:base-package@0.0.0', 'cfs:storage-adapter@0.0.0']);
  api.add_files('filesystem.server.js', 'server');
  api.add_files('filesystem.client.js', 'client');
});

Package.on_test(function(api) {
  api.use(['cfs:filesystem', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests.js', 'server');
});
