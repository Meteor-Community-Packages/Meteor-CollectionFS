Package.describe({
  summary: "\u001b[32mv0.3.0 (under development)\n" +
          "\u001b[33m-----------------------------------------\n" +
          "\u001b[0m Filesystem for Meteor, collectionFS      \n" +
          "\u001b[0m                                          \n" +
          "\u001b[33m-------------------------------------RaiX\n"
});

Npm.depends({
  gm: "1.13.1", //for fileobject-gm package
  knox: "0.8.6", //for fileobject-storage-s3 package
  connect: "2.9.0" //for fileobject-storage-filesystem package
});

Package.on_use(function(api) {
  "use strict";
  
  //TODO divide these into separate repos
  
  //queue package
  api.use(['deps', 'underscore']);
  if (api.export) {
    api.export('GQ');
  }
  api.add_files([
    'pkg-queue/task.js',
    'pkg-queue/queue.js'
  ], 'client');
  
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
    'pkg-uploads-collection/uploadsCollection_client.js',
    'pkg-uploads-collection/storageAdaptors_client.js',
    'pkg-uploads-collection/uploadRecord_client.js'
  ], 'client');

  api.add_files([
    'pkg-uploads-collection/fileObject_server.js',
    'pkg-uploads-collection/uploadRecord_server.js',
    'pkg-uploads-collection/filehandlers_server.js',
    'pkg-uploads-collection/uploadsCollection_server.js',
    'pkg-uploads-collection/storageAdaptors_server.js'
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
  api.use(['underscore'], 'server');
  api.add_files([
    'pkg-fileobject-gm/server.js'
  ], 'server');

  //fileobject-storage-filesystem package
  api.use(['routepolicy', 'webapp', 'underscore'], 'server');
  api.add_files([
    'pkg-fileobject-storage-filesystem/server.js'
  ], 'server');
  api.add_files([
    'pkg-fileobject-storage-filesystem/client.js'
  ], 'client');

  //fileobject-storage-s3 package
  api.use(['underscore'], 'server');
  api.add_files([
    'pkg-fileobject-storage-s3/server.js'
  ], 'server');
  api.add_files([
    'pkg-fileobject-storage-s3/client.js'
  ], 'client');

  //fileobject-storage-gridfs package
  api.use(['underscore', 'mongo-livedata'], 'server');
  api.export && api.export('CollectionFS');
  api.add_files([
    'pkg-fileobject-storage-gridfs/server.js'
  ], 'server');
});


Package.on_test(function (api) {
  api.use('collectionFS');
  api.use('test-helpers', 'server');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('collectionFS.server.tests.js', 'server');
  api.add_files('collectionFS.client.tests.js', 'client');
});
