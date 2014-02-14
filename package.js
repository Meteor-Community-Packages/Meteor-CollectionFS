Package.describe({
  summary: 'CollectionFS, Base package'
});

Package.on_use(function(api) {
  api.use(['deps', 'underscore', 'ejson', 'check']);

  if (api.export) {
    api.export('FS');
  }

  api.add_files([
    'shared.js',
    'argParser.js'
  ], ['client', 'server']);
});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
