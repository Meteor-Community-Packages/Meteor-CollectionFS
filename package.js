 Package.describe({
  version: '0.0.0',
  summary: 'CollectionFS, temporary storage'
});

Npm.depends({
  'combined-stream': '0.0.4'
});

Package.on_use(function(api) {
  api.use(['cfs-base-package', 'cfs-file']);

  api.use('cfs-filesystem', { weak: true });
  api.use('cfs-gridfs', { weak: true });

  api.add_files([
    'tempStore.js'
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionfs');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
});
