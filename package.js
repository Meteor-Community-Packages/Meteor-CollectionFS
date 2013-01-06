Package.describe({
  summary: "Filesystem for Meteor, collectionFS"
});

Package.on_use(function(api) {
  api.add_files('collectionFS_common.js', ['client', 'server']);
  api.add_files('collectionFS_server.js', 'server');
  api.add_files('collectionFS_client.js', 'client');
});