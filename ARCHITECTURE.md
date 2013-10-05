#Architecture
We should be aware of ways to scale both horisontal and vertical and have the security going along here.

##CFS file access point
This is the point where all files are served and secured, this on both `ddp` and `http`.
The actual data is kept in the `files` file record and chunks / data is accessed by file `storage adapters`:
* Mongodb *(Network connection)*
* Local files *(Native direct access)*
* Fileserver *(Network connection)*
* External fileservers *(Network connection)*

```
Client <---- (ddp/http) --- | CFS access point |
                            |  Security layer  |
                            | Storage adapters |
                              |    |    |    |
                Mongo–––––––––O    |    |    |
                Local––––––––––––––O    |    |
                Fileserver––––––––––––––O    |
                External server––––––––––––––O
```

Serving via ddp or http is again two seperate adapters that allow access via two different protocols.

##Fileserver
The fileserver can be different to the bundle server, this is the pure serving and storing interface. The bundle server would proxi the traffic making sure that only autorized users can access the files accordingly to policy.

##Proxy adapters
The http and the ddp file proxy allows http access to the `CFS access point`, the access point is a universal interface keeping track of security and file locations. *It publishes the files*

```
Client ––> fileId + handlerId + Token + userId ––|
   |                                     ________V_________
   O––––––––––| HTTP |–––––––|          |                  |
                             |––Stream––| CFS access point |
Client <––––––| DDP |––––––––|          |__________________|
   |                                             |
   O_____________Authenticated line _____________O
```

*Each of the `http` and `ddp` packages adds both `client api` and `server proxy adapters`*

The `http` package uses a package called `http-access` this package can be used to publish data at rest points - this way the package could be used for serving collections in `json` or `xml` formats.
Example of the `http-access package`:
```js
  HTTP.methods({
    '/cfs/files/list': function(query) {
      // this.userId
      // Here I can serve raw data on /myList
      return '<b>Hello world</b>';
    }
  });
```

##Files distribution interface
The interface consists of basicly two main operators for uploading and downloading file chunks.
`loadChunk` and `saveChunk` these are direct coupled to a storage adapter that handles the actual data storage.

##File record distribution interface
This interface is the `files` collection in a `CollectionFS` this contains the reactivity, creating/deleting files - It's the data definition and pointer to the datachunks.
Basicly a normal `Meteor.Collection`.
When using `ddp` handling `Meteor.Collections` are trivial - but to allow distribution on `HTTP` we have to create a `HTTP.publish` mechanisme for collections and a `CRUD` rest point for manipulating data in a collection.

We should be able to have an interface like:
```js
  // Add access points for `GET`, `POST`, `PUT`, `DELETE`
  HTTP.publish(myCollectionFS, function(data) {
    // this.userId, this.query, this.params
    return myCollectionFS.find({});
  });

  HTTP.unpublish('/cfs/files'); // This would remove the access
```
*The interface would support `json` but maybe also `xml` in time*

##Filehandlers
The filehandlers part is super powerfull and makes life much easier when caching, handling and converting files to different instances of each file.
File handlers is a external package that uses the file storage adapters to create multiple versions of the uploaded file.
The filehandler is passed two adapters one containing the master and a second containing the output area.
This way one can have files uploaded to the mongo db but have filehandlers create versions on another adapter.

```
File input adapter ––> | filehandlers |–––> Output adapter
(Storage adapter)                          (Storage adapter)
                                              |   |   |
                                              V   V   V
                                           (file versions)
```



##Storage adapters
A storage adapter is the core of `CFS` it's a file access object that provides a standard interface for filehandling. It consists of a reactive collection `files` also known as a `fileRecord`. The filerecord holds information about the files such as size, name and path.
The file record is constant kept updated / syncronized with the actual storage. It may be challanging to write storage adapters since it would require hooks and watching for local or remote filesystems.
Each type of storage handlers may require some options for configuration, some 

###Setting storage adapters
We have added the `filesystem` storage adapter as default dependency in `CFS` and `new CollectionsFS(name)` will naturally bind it self on the `filesystem` storage adapter unless another adapter is specified.
All storage adapters installed are located in the `CFS.Storage` scope and will all be instance of `CFS.StorageAdapter`.

```js
  var pictures = new CollectionFS('mypictures', '~/www/pictures')
or
  var pictures = new CollectionFS('mypictures', {
    storageAdapter: new CFS.Storage.Filesystem('~/www/pictures')
  });
```requires a path while others may require some authentication setup.

##Filehandlers
Filehandlers are run when a file and all its data is successfully added to it's storage adapter.
The filehandler will intercept the fileupload for the purpose of creating a cached version of the file until its handled. *unless the storage adapter is of type Filesystem - since there would be no need for a cached version* 

The filehandler engine is throttled to match the server usage - much like the current version and will resume failed filehandlers using the existing algoritme. *It could be made even more clever and self monitoring - but for the time being it would work and have the api be completed*

When the filehandler engine has selected a file to handle it will check if its found in the filesystem or cache. If not found it would try to load the file from its storage adapter and into the cache. *if its using the filesystem - then the filerecord is not updated or syncronized*

The engine will now rig the next missing file version user defined filehandler. It provides `this` as a transformed file object, the filehandler takes an option for adding storage adapters.

```js
  pictures.fileHandlers({
    "s3": function() {
      // this referes to a cached copy of the file to be modified / handled
      this.resize(400);
      // The storage adapter returns a reference to the stored file
      return CFS.Storage.S3.storeFile(this, s3AccountInfoObject);
    },
    "dropbox": function() {
      return CFS.Storage.Dropbox.storeFile(this, dbAccountInfoObject);
    },
    "localThumbnail": function() {
      this.resize(50);
      return CFS.Storage.Filesystem.storeFile(this, opts);
    }
  });
```
*The imagick api is a filehandler plugin package so its available when installed - but only if file is of type image?*