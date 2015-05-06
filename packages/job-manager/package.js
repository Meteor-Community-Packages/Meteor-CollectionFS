Package.describe({
  name: 'cfs:job-manager',
  version: '0.1.0',
  summary: 'CollectionFS queue job management add-on',
  git: '',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0.3.1');


  api.use([
    'cfs:base-package@0.0.29',
    'cfs:tempstore@0.1.5'
  ]);

  api.use([
    'vsivsi:job-collection@1.1.0'
  ]);

  api.use([
    'random'
  ], 'server');

  api.addFiles([
    'common.js'
  ], ['client', 'server']);

  api.addFiles([
    'server.js'
  ], 'server');

});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('cfs:job-manager');
  //api.addFiles('tests/server-tests.js');
});
