Package.describe({
  name: 'data-man',
  summary: 'A data manager, allowing you to attach various types of data and get it back in various other types'
});

Npm.depends({
  mime: "1.2.11",
  'simple-bufferstream': "0.0.4",
  request: "2.34.0",
  temp: "0.7.0" // for tests only
});

Package.on_use(function(api) {
  api.use(['ejson', 'cfs-filesaver']);

  api.export('DataMan');

  api.add_files([
    'client/Blob.js', //polyfill for browsers without Blob constructor; currently necessary for phantomjs support, too
    'client/data-man-api.js'
  ], 'client');

  api.add_files([
    'server/data-man-api.js',
    'server/data-man-buffer.js',
    'server/data-man-datauri.js',
    'server/data-man-filepath.js',
    'server/data-man-url.js',
    'server/data-man-readstream.js'
  ], 'server');

});

Package.on_test(function (api) {
  api.use(['data-man', 'http', 'tinytest', 'test-helpers', 'http-methods']);

  api.add_files(['tests/common.js', 'tests/client-tests.js'], 'client');
  api.add_files(['tests/common.js', 'tests/server-tests.js'], 'server');
});
