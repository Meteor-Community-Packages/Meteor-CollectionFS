Package.describe({
  version: '0.0.0',
  summary: 'CollectionFS, Base package'
});

Package.on_use(function(api) {
  api.use(['deps', 'underscore', 'ejson']);

  if (api.export) {
    api.export('FS');
    api.export('_Utility', { testOnly: true });
  }

  api.add_files([
    'base-common.js',
    'base-server.js'
  ], 'server');

  api.add_files([
    'base-common.js',
    'base-client.js'
  ], 'client');
});

Package.on_test(function (api) {
  api.use(['cfs-base-package', 'cfs-file']);
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/common-tests.js', ['client', 'server']);
});
