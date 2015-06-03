Package.describe({
  git: 'https://github.com/CollectionFS/Meteor-CollectionFS.git',
  name: 'cfs:standard-packages',
  version: '0.5.10',
  summary: 'Filesystem for Meteor, collectionFS'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  // Rig the collectionFS package v2
  api.imply([
    // Base util rigs the basis for the FS scope and some general helper methods
    'cfs:base-package@0.0.30',
    // Want to make use of the file object and its api, yes!
    'cfs:file@0.1.17',
    // Add the FS.Collection to keep track of everything
    'cfs:collection@0.5.6',
    // Support filters for easy rules about what may be inserted
    'cfs:collection-filters@0.2.4',
    // Add the option to have ddp and http access point
    'cfs:access-point@0.1.49',
    // The server queues jobs for local or remote workers to make copies of our files
    'cfs:job-manager@0.1.0',
    // Add file workers to this app, picking up jobs out of the Mongo backed queue
    'cfs:worker@0.2.0',
    // By default we want to support uploads over HTTP
    'cfs:upload-http@0.0.20',
    // Observers for FSCollections
    'cfs:collection-observers@0.1.0'
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
