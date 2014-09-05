Package.describe({
  name: 'cfs:standard-packages',
  version: '0.0.0',
  summary: 'Filesystem for Meteor, collectionFS'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');
  
  // Rig the collectionFS package v2
  api.imply([
    // Base util rigs the basis for the FS scope and some general helper mehtods
    'cfs:base-package@0.0.0',
    // Want to make use of the file object and its api, yes!
    'cfs:file@0.0.0',
    // Add the FS.Collection to keep track of everything
    'cfs:collection@0.0.0',
    // Support filters for easy rules about what may be inserted
    'cfs:collection-filters@0.0.0',
    // Add the option to have ddp and http access point
    'cfs:access-point@0.0.0',
    // We might also want to have the server create copies of our files?
    'cfs:worker@0.0.0',
    // By default we want to support uploads over HTTP
    'cfs:upload-http@0.0.0',
  ]);

});

Package.on_test(function (api) {
  api.use('cfs:standard-packages');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('tests/server-tests.js', 'server');
  api.add_files('tests/client-tests.js', 'client');
});
