Package.describe({
  summary: "Filesystem for Meteor, collectionFS"
});

Package.on_use(function(api) {
  api.use('deps');

  api.add_files([ 'myConsole.js' ], [ 'client', 'server' ]);

  api.add_files(['collectionFS_client.js',
  				 'collectionFS_browser.js'], 'client');
  
  api.add_files([
  				'collectionFS_filesystem.js',
  				'collectionFS_server.js',
  				'collectionFS_filehandlers.js'], 'server');
  
  api.add_files([
            'collectionFS_common.js'], [ 'client', 'server' ]);

});