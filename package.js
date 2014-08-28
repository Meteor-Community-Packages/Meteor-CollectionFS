Package.describe({
  version: '0.0.0',
  summary: 'CollectionFS, FS.File object'
});

Npm.depends({
  temp: "0.7.0" // for tests only
});

Package.on_use(function(api) {

  // This imply is needed for tests, and is technically probably correct anyway.
  api.imply([
    'cfs-base-package'
  ]);

  api.use([
    'cfs-base-package',
    'cfs-storage-adapter',
    'deps',
    'check',
    'livedata',
    'mongo-livedata',
    'http',
    'data-man',
    'emitter'
  ]);

  // Weak dependency on numeral pkg, only if you want to use the formattedSize method
  api.use(['numeral'], ['client', 'server'], {weak: true});

  api.add_files([
    'fsFile-common.js'
  ], 'client');

  api.add_files([
    'fsFile-common.js',
    'fsFile-server.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use([
    'collectionfs', 'cfs-gridfs', 'tinytest', 'http', 'test-helpers', 'http-methods'
  ]);

  api.add_files([
    'tests/file-tests.js'
  ]);
});
