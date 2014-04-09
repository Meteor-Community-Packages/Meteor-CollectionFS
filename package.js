Package.describe({
  summary: 'Filesystem for Meteor, collectionFS'
});

Package.on_use(function(api) {
  // Rig the collectionFS package v2
  api.imply([
    // Base util rigs the basis for the FS scope and some general helper mehtods
    'cfs-base-package',
    // Want to make use of the file object and its api, yes!
    'cfs-file',
    // Add the FS.Collection to keep track of everything
    'cfs-collection',
    // Support filters for easy rules about what may be inserted
    'cfs-collection-filters',
    // Add the option to have ddp and http access point
    'cfs-access-point',
    // We might also want to have the server create copies of our files?
    'cfs-worker',
    // By default we want to support uploads over HTTP
    'cfs-upload-http'
  ]);

});

Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
