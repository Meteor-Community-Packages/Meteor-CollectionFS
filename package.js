Package.describe({
    summary: 'Filesystem for Meteor, collectionFS\n'+
         '\u001b[32mv0.3.6 (under development)\n'+
         '\u001b[33m-----------------------------------------\n'+
         '\u001b[0m Filesystem for Meteor, collectionFS      \n'+
         '\u001b[0m                                          \n'+
         '\u001b[33m-------------------------------------RaiX\n'
});

Package.on_use(function(api) {
  'use strict';
  api.use(['deps', 'underscore', 'templating', 'handlebars', 'mongo-livedata']);

  api.use('cfs-public-folder', { weak: true });

  api.export && api.export(['CollectionFS', 'CFSErrorType']);

  api.add_files([ 'myConsole.js' ], [ 'client', 'server' ]);

  api.add_files([
    'FileSaver.js',
    'collectionFS_templates.html',
    'collectionFS_client.js',
    'collectionFS_client.api.js',
    'collectionFS_handlebars.js'], 'client');

  api.add_files([
    'collectionFS_filesystem.js',
    'collectionFS_server.js',
    'collectionFS_filehandlers.js',
    'collectionFS_server.api.js'], 'server');

  api.add_files([
    'collectionFS_common.js',
    'numeral.js'], ['client', 'server']);

});


Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('collectionFS.server.tests.js', 'server');
  api.add_files('collectionFS.client.tests.js', 'client');
});