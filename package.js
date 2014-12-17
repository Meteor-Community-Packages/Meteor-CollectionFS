Package.describe({
  git: 'https://github.com/CollectionFS/Meteor-cfs-file.git',
  name: 'cfs:file',
  version: '0.0.0',
  summary: 'CollectionFS, FS.File object'
});

Npm.depends({
  temp: "0.7.0" // for tests only
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  // This imply is needed for tests, and is technically probably correct anyway.
  api.imply([
    'cfs:base-package@0.0.26'
  ]);

  api.use([
    'cfs:base-package@0.0.26',
    'cfs:storage-adapter@0.0.0',
    'deps',
    'check',
    'livedata',
    'mongo-livedata',
    'http',
    'cfs:data-man@0.0.1',
    'raix:eventemitter@0.1.0'
  ]);

  // Weak dependency on numeral pkg, only if you want to use the formattedSize method
  // api.use(['numeral'], ['client', 'server'], {weak: true});

  api.addFiles([
    'fsFile-common.js'
  ], 'client');

  api.addFiles([
    'fsFile-common.js',
    'fsFile-server.js'
  ], 'server');
});

// Package.on_test(function (api) {
//   api.use([
//     'collectionfs', 'cfs:gridfs', 'tinytest', 'http', 'test-helpers', 'http:methods'
//   ]);

//   api.addFiles([
//     'tests/file-tests.js'
//   ]);
// });
