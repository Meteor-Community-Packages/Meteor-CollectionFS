Package.describe({
  git: 'https://github.com/CollectionFS/Meteor-CollectionFS.git',
  name: 'cfs:standard-packages',
  version: '0.5.4',
  summary: 'Filesystem for Meteor, collectionFS'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  // Rig the collectionFS package v2
  api.imply([
    // Base util rigs the basis for the FS scope and some general helper mehtods
    'cfs:base-package@0.0.27',
    // Want to make use of the file object and its api, yes!
    'cfs:file@0.1.15',
    // Add the FS.Collection to keep track of everything
    'cfs:collection@0.5.4',
    // Support filters for easy rules about what may be inserted
    'cfs:collection-filters@0.2.3',
    // Add the option to have ddp and http access point
    'cfs:access-point@0.1.43',
    // We might also want to have the server create copies of our files?
    'cfs:worker@0.1.3',
    // By default we want to support uploads over HTTP
    'cfs:upload-http@0.0.19',
  ]);

});

Package.onTest(function (api) {
  api.use('cfs:standard-packages');
  api.use('test-helpers@1.0.0', 'server');
  api.use([
    'tinytest@1.0.0',
    'underscore@1.0.0',
    'ejson@1.0.0',
    'ordered-dict@1.0.0',
    'random@1.0.0',
    'tracker@1.0.3'
  ]);

  api.addFiles('tests/server-tests.js', 'server');
  api.addFiles('tests/client-tests.js', 'client');
});
