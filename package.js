Package.describe({
  summary: "\u001b[32mv0.3.0 (under development)\n" +
          "\u001b[33m-----------------------------------------\n" +
          "\u001b[0m Filesystem for Meteor, collectionFS      \n" +
          "\u001b[0m                                          \n" +
          "\u001b[33m-------------------------------------RaiX\n"
});

Npm.depends({
  gm: "1.13.1", //for fileobject-gm package
  knox: "0.8.6" //for fileobject-storage-s3 package
});

Package.on_use(function(api) {
  "use strict";
  
  //TODO divide these into separate repos
  
  //uploads-collection package
  api.use(['deps', 'underscore', 'mongo-livedata', 'ejson']);
  if (api.export) {
    api.export('FileObject');
    api.export('UploadRecord');
    api.export('UploadsCollection');
  }
  api.add_files([
    'pkg-uploads-collection/fileObject_common.js',
    'pkg-uploads-collection/uploadRecord_common.js'
  ], ['client', 'server']);

  api.add_files([
    'pkg-uploads-collection/FileSaver.js',
    'pkg-uploads-collection/fileObject_client.js',
    'pkg-uploads-collection/uploadManager_client.js',
    'pkg-uploads-collection/uploadsCollection_client.js'
  ], 'client');

  api.add_files([
    'pkg-uploads-collection/fileObject_server.js',
    'pkg-uploads-collection/uploadRecord_server.js',
    'pkg-uploads-collection/filehandlers_server.js',
    'pkg-uploads-collection/uploadsCollection_server.js'
  ], 'server');

  api.add_files([
    'pkg-uploads-collection/uploadsCollection_common.js'
  ], ['client', 'server']);

  //uploads-collection-handlebars package
  api.use(['underscore', 'templating', 'handlebars']);
  api.add_files([
    'pkg-uploads-collection-handlebars/templates.html',
    'pkg-uploads-collection-handlebars/handlebars.js'
  ], 'client');

  //fileobject-gm package
  api.use(['underscore']);
  api.add_files([
    'pkg-fileobject-gm/server.js'
  ], 'server');

  //fileobject-storage-filesystem package
  api.use(['underscore']);
  api.add_files([
    'pkg-fileobject-storage-filesystem/server.js'
  ], 'server');

  //fileobject-storage-s3 package
  api.use(['underscore']);
  api.add_files([
    'pkg-fileobject-storage-s3/server.js'
  ], 'server');

  //collectionFS package
  api.use(['deps', 'underscore', 'templating', 'handlebars', 'mongo-livedata']);
  api.export && api.export('CollectionFS');
  api.add_files([
    'pkg-collectionFS/numeral.js',
    'pkg-collectionFS/collectionFS_client.js',
    'pkg-collectionFS/fileObject_client.js',
    'pkg-collectionFS/downloadManager_client.js',
    'pkg-collectionFS/templates.html',
    'pkg-collectionFS/handlebars.js'
  ], 'client');

  api.add_files([
    'pkg-collectionFS/collectionFS_server.js',
    'pkg-collectionFS/fileObject_server.js'
  ], 'server');

  api.add_files([
    'pkg-collectionFS/collectionFS_common.js'
  ], ['client', 'server']);

});
