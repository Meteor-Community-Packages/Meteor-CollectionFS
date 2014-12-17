 Package.describe({
  git: 'https://github.com/CollectionFS/Meteor-cfs-tempstore.git',
  name: 'cfs:tempstore',
  version: '0.0.2',
  summary: 'CollectionFS, temporary storage'
});

Npm.depends({
  'combined-stream': '0.0.4'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use(['cfs:base-package@0.0.26', 'cfs:file@0.0.0']);

  api.use('cfs:filesystem@0.0.0', { weak: true });
  api.use('cfs:gridfs@0.0.26', { weak: true });

  api.addFiles([
    'tempStore.js'
  ], 'server');
});

// Package.on_test(function (api) {
//   api.use('collectionfs');
//   api.use('test-helpers', 'server');
//   api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
//            'random', 'deps']);

//   api.addFiles('tests/server-tests.js', 'server');
// });
