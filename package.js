Package.describe({
  summary: "Filesystem storage adapter for CollectionFS"
});

Npm.depends({
  chokidar: "0.7.0",
  mkdirp: "0.3.5"
});

Package.on_use(function(api) {
  "use strict";
  api.use(['collectionFS'], 'server');
  api.add_files([
    'filesystem.js'
  ], 'server');
});

Package.on_test(function(api) {
  api.use(['cfs-filesystem', 'test-helpers', 'tinytest'], 'server');
  api.add_files('tests.js', 'server');
});