Package.describe({
  summary: "Filesystem for Meteor, collectionFS"
});

Package.on_use(function(api) {
  api.use(['deps', 'underscore', 'templating']);

  api.add_files([ 'myConsole.js' ], [ 'client', 'server' ]);

  api.add_files([
          'collectionFS_templates.html',
          'collectionFS_client.js',
          'collectionFS_client.api.js',
          'collectionFS_handlebars.js',
          'FileSaver.min.js'], 'client');
  
  api.add_files([
  				'collectionFS_filesystem.js',
  				'collectionFS_server.js',
  				'collectionFS_filehandlers.js',
          'collectionFS_server.api.js'], 'server');
  
  api.add_files([
          'collectionFS_common.js',
          'numeral.js'], ['client', 'server']);

});