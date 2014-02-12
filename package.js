Package.describe({
  summary: 'CollectionFS, Base package'
});

Npm.depends({
//  mime: "1.2.11",
  temp: "0.6.0"
});

Package.on_use(function(api) {
  api.use(['deps', 'underscore', 'check', 'livedata', 'mongo-livedata',
    'ejson']);

  if (api.export) {
    api.export('FS');
  }

  api.add_files([
    'shared.js',
    'argParser.js',
  ], 'client');

  api.add_files([
    'shared.js',
    'argParser.js',
  ], 'server');
});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/client-tests.js', 'server');
  api.add_files('tests/server-tests.js', 'client');
});
