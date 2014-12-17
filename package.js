Package.describe({
  git: 'https://github.com/CollectionFS/Meteor-cfs-storage-adapter.git',
  name: 'cfs:storage-adapter',
  version: '0.0.0',
  summary: 'CollectionFS, Class for creating Storage adapters'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use([
    // CFS
    'cfs:base-package@0.0.26',
    // Core
    'deps',
    'check',
    'livedata',
    'mongo-livedata',
    'ejson',
    // Other
    'raix:eventemitter@0.1.0'
  ]);

  // We want to make sure that its added to scope for now if installed.
  // We have set a deprecation warning on the transform scope
  api.use('cfs:graphicsmagick@0.0.0', 'server', { weak: true });

  api.addFiles([
    'storageAdapter.client.js'
  ], 'client');

  api.addFiles([
    'storageAdapter.server.js',
    'transform.server.js'
  ], 'server');
});

Package.onTest(function (api) {
  api.use('cfs:storage-adapter');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.addFiles('tests/server-tests.js', 'server');
  api.addFiles('tests/client-tests.js', 'client');
});
