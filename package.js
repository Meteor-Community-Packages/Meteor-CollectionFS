Package.describe({
  name: 'cfs:file',
  version: '0.0.1',
  summary: 'CollectionFS, FS.File object'
});

Npm.depends({
  temp: "0.7.0" // for tests only
});

Package.onUse(function(api) {

  api.use([
    'cfs:base-package@0.0.0',
    'cfs:storage-adapter@0.0.0',
    'tracker@1.0.3',
    'check@1.0.2',
    'ddp@1.0.12',
    'mongo@1.0.9',
    'http@1.0.8',
    'cfs:data-man@0.0.2',
    'raix:eventemitter@0.0.2'
  ]);

  // This imply is needed for tests, and is technically probably correct anyway.
  api.imply([
    'cfs:base-package@0.0.0'
  ]);

  api.addFiles([
    'fsFile-common.js'
  ], 'client');

  api.addFiles([
    'fsFile-common.js',
    'fsFile-server.js'
  ], 'server');
});

Package.onTest(function (api) {
  api.use([
    'cfs:standard-packages@0.0.0',
    'cfs:gridfs@0.0.0',
    'tinytest@1.0.0',
    'http@1.0.0',
    'test-helpers@1.0.0',
    'cfs:http-methods@0.0.24'
  ]);

  api.addFiles([
    'tests/file-tests.js'
  ]);
});
