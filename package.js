Package.describe({
  name: 'cfs:collection-filters',
  version: '0.0.0',
  summary: 'CollectionFS, adds FS.Collection filters'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use(['cfs:base-package@0.0.0', 'cfs:collection@0.0.0']);

  api.add_files([
    'filters.js'
  ], 'client');

  api.add_files([
    'filters.js'
  ], 'server');
});

// Package.on_test(function (api) {
//   api.use('collectionfs');
//   api.use('test-helpers', 'server');
//   api.use(['tinytest']);

//   api.add_files('tests/server-tests.js', 'server');
//   api.add_files('tests/client-tests.js', 'client');
// });
