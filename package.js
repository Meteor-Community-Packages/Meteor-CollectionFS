Package.describe({
  summary: "\u001b[32mv0.4.0 (under development)\n" +
          "\u001b[33m-----------------------------------------\n" +
          "\u001b[0m Filesystem for Meteor, collectionFS      \n" +
          "\u001b[0m                                          \n" +
          "\u001b[33m-------------------------------------RaiX\n"
});

Npm.depends({
  gm: "1.13.1", //for cfs-fileobject-gm package
  knox: "0.8.6", //for cfs-storage-s3 package
  connect: "2.9.0" //for cfs-storage-filesystem package
});

Package.on_use(function(api) {
  "use strict";
  
  //TODO divide these into separate repos
  
  //queue package (move to another repo and make dependency)
  api.use(['deps', 'underscore']);
  if (api.export) {
    api.export('GQ');
  }
  api.add_files([
    'pkg-queue/task.js',
    'pkg-queue/queue.js'
  ], ['client', 'server']);
  
  //collectionFS core package
  api.use(['deps', 'underscore', 'mongo-livedata', 'ejson', 'collection-hooks', 'http-methods']);
  if (api.export) {
    api.export('FileObject');
    api.export('UploadRecord');
    api.export('CollectionFS');
  }
  api.add_files([
    'pkg-collectionFS/fileObject_common.js',
    'pkg-collectionFS/uploadRecord_common.js'
  ], ['client', 'server']);

  api.add_files([
    'pkg-collectionFS/FileSaver.js',
    'pkg-collectionFS/fileObject_client.js',
    'pkg-collectionFS/cfs_client.js',
    'pkg-collectionFS/uploadRecord_client.js'
  ], 'client');

  api.add_files([
    'pkg-collectionFS/fileObject_server.js',
    'pkg-collectionFS/uploadRecord_server.js',
    'pkg-collectionFS/cfs_server.js',
    'pkg-collectionFS/storageAdaptors_server.js'
  ], 'server');

  api.add_files([
    'pkg-collectionFS/cfs_common.js'
  ], ['client', 'server']);

  //collectionFS-handlebars package
  api.use(['underscore', 'templating', 'handlebars']);
  api.add_files([
    'pkg-collectionFS-handlebars/templates.html',
    'pkg-collectionFS-handlebars/handlebars.js'
  ], 'client');

  //fileobject-gm package
  api.use(['underscore'], 'server');
  api.add_files([
    'pkg-cfs-fileobject-gm/server.js'
  ], 'server');

  //cfs-storage-filesystem package
  api.use(['underscore'], 'server');
  api.add_files([
    'pkg-cfs-storage-filesystem/server.js'
  ], 'server');

  //cfs-storage-s3 package
  api.use(['underscore'], 'server');
  api.add_files([
    'pkg-cfs-storage-s3/server.js'
  ], 'server');

  //cfs-storage-gridfs package
  api.use(['underscore', 'mongo-livedata'], 'server');
  api.add_files([
    'pkg-cfs-storage-gridfs/gridfs.js',
    'pkg-cfs-storage-gridfs/server.js'
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
