Package.describe({
  summary: "\u001b[32mv0.3.0 (under development)\n" +
          "\u001b[33m-----------------------------------------\n" +
          "\u001b[0m Filesystem for Meteor, collectionFS      \n" +
          "\u001b[0m                                          \n" +
          "\u001b[33m-------------------------------------RaiX\n"
});

Npm.depends({gm: "1.13.1"}); //for fileobject-gm package

Package.on_use(function(api) {
  "use strict";
  api.use(['deps', 'underscore', 'templating', 'handlebars', 'mongo-livedata', 'ejson']);

  if (api.export) {
    api.export('FileObject');
    api.export('UploadRecord');
    api.export('UploadsCollection');
    api.export('CollectionFS');
  }

  api.add_files(['myConsole.js'], ['client', 'server']);

  //fileobject package
  api.add_files([
    'pkg-fileobject/fileObject_common.js',
    'pkg-fileobject/uploadRecord_common.js'
  ], ['client', 'server']);

  api.add_files([
    'pkg-fileobject/FileSaver.js',
    'pkg-fileobject/fileObject_client.js',
    'pkg-fileobject/uploadManager_client.js',
    'pkg-fileobject/uploadsCollection_client.js'
  ], 'client');

  api.add_files([
    'pkg-fileobject/fileObject_server.js',
    'pkg-fileobject/uploadRecord_server.js',
    'pkg-fileobject/filehandlers_server.js',
    'pkg-fileobject/uploadsCollection_server.js'
  ], 'server');

  api.add_files([
    'pkg-fileobject/uploadsCollection_common.js'
  ], ['client', 'server']);
  
  //graphicsmagick package
  api.add_files([
    'pkg-fileobject-gm/fileObject_gm_server.js'
  ], 'server');

  //filesystem storage package
  api.add_files([
    'pkg-filesystem-storage/filesystem.js'
  ], 'server');

  //s3 storage package
  api.use(['knox']);
  api.add_files([
    'pkg-s3-storage/s3_server.js'
  ], 'server');

  //collectionFS package
  api.add_files([
    'pkg-cfs/numeral.js',
    'pkg-cfs/collectionFS_client.js',
    'pkg-cfs/fileObject_client.js',
    'pkg-cfs/downloadManager_client.js',
    'pkg-cfs/templates.html',
    'pkg-cfs/handlebars.js'
  ], 'client');

  api.add_files([
    'pkg-cfs/collectionFS_server.js',
    'pkg-cfs/fileObject_server.js'
  ], 'server');

  api.add_files([
    'pkg-cfs/collectionFS_common.js'
  ], ['client', 'server']);

  //handlebars package
  api.add_files([
    'pkg-fileobject-handlebars/templates.html',
    'pkg-fileobject-handlebars/handlebars.js'
  ], 'client');

});
