Package.describe({
  name: 'cfs-collection-filters',
  summary: 'CollectionFS, adds FS.Collection filters'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package, cfs-collection']);

  api.add_files([
    'filters.js'
  ], 'client');

  api.add_files([
    'filters.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
