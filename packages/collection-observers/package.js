Package.describe({
  name: 'cfs:collection-observers',
  version: '0.1.0',
  summary: 'CollectionFS observers trigger the Collection to emit events based on changes made outside the application. Run on a single instance in a multi-instance system',
  git: '',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');

  api.use([
    'cfs:base-package@0.0.30'
  ]);

  api.addFiles('collection-observers.js', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('cfs:collection-observers');
  api.addFiles('collection-observers-tests.js');
});
