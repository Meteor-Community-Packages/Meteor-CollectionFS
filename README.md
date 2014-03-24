#CollectionFS (pre1) [![Build Status](https://travis-ci.org/CollectionFS/Meteor-CollectionFS.png?branch=master)](https://travis-ci.org/CollectionFS/Meteor-CollectionFS)

NOTE: This branch is under active development right now (2014-3-24). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

If you have Documentation feedback/requests please post on [issue 206](https://github.com/CollectionFS/Meteor-CollectionFS/issues/206)

__ETR: Before April__

> For the old api, edit your `smart.json`:
> ```js
>   "packages": {
>     "collectionFS": "0.3.7",
>   }
> ```

CollectionFS is a smart package for Meteor that provides a complete file
management solution including uploading, downloading, storage, synchronization,
manipulation, and copying. It supports several storage adapters for saving to
the local filesystem, GridFS, or S3, and additional storage adapters can be
created.

## Installation

Right now this branch should be used for testing or experimentation only.
As such.

Install Meteorite. Run command `mrt add collectionFS`  to install or clone `devel` into your package folder.

__NOTE: use `mrt update --force` if you get errors!__
`mrt` is choking and will throw errors like:
```
✘ [branch: https://github.com/CollectionFS/Meteor-cfs-base-package.git#master] conflicts with [latest]
Can't resolve dependencies! Use --force if you don't mind mrt taking a wild guess and running your app anyway.
```
Ignore this message for all `CollectionFS` packages - it just overwrites and should work fine - the new Meteor package system should fix this when released.

'collectionFS' is the main package. Beyond that, you only need to add the
packages you want to use. See the Storage Adapters
section for a list of the available storage adapter packages.

> Deprecating:
> Most people will probably want `cfs-handlebars`. If you're dealing with image files, you'll probably want `cfs-graphicsmagick`. Note that you'll have to also install GraphicsMagick and/or ImageMagick on the server or development machine. See the README for the `cfs-graphicsmagick` package. All the packages have their own README files you should read.



After updating `smart.json`, run some commands:

```bash
$ cd <app dir>
$ mrt update
$ meteor add collectionFS
$ meteor add <package name>
```

You must call `meteor add` for all packages that you manually added to `smart.json`.

Then you should be good to go. To pull down the most recent updates to every package,
just run `mrt update` again at any time.

If you're having trouble, you can alternatively try cloning
[this repo](https://github.com/copleykj/CollectionFS-Demo).

## Introduction

The CollectionFS package makes available two important global variables:
`FS.File` and `FS.Collection`.

* A `FS.File` wraps a file and its data
on the client or server. It is similar to the browser `File` object (and can be
created from a `File` object), but it has additional properties and methods.
* A `FS.Collection` provides a collection in which information about 
files can be stored. It also provides
the necessary mechanisms to upload and download the files, track
upload and download progress reactively, pause and resume uploads and downloads,
and more.

A document from a `FS.Collection` is represented as a `FS.File`.

## Getting Started

The first step in using this package is to define a `FS.Collection`.

*common.js:*

```js
var Images = new FS.Collection("images", {
  stores: [new FS.Store.FileSystem("images", {path: "~/uploads"})]
});
```

In this example, we've defined a FS.Collection named "images", which will
be a new collection in your MongoDB database with the name "_cfs.images.filerecord". We've
also told it to store the files in `~/uploads` on the local filesystem.

Your FS.Collection variable does not necessarily have to be global on the
client or the server, but be sure to give it the same name (the first argument)
on both the client and the server.

It's highly recommended that you put the server code in a server-only file that
will not be sent to the client because the storage adapters sometimes require
sensitive information like access keys.

Now we can upload a file from the client. Here is an example of doing so from
the change event handler of an HTML file input:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    var files = event.target.files;
    for (var i = 0, ln = files.length; i < ln; i++) {
      Images.insert(files[i], function (err, id) {
        //Inserted new doc with _id = id, and kicked off the data upload using DDP
      });
    }
  }
});
```

> Note: The `FS.Utility.eachFile` can be used instead of `for`

Notice that the only thing we're doing is passing the browser-provided `File`
object to `Images.insert()`. This will create a `FS.File` from the
`File`, link it with the `Images` FS.Collection, and then immediately
begin uploading the data to the server with reactive progress updates.

On both the client and the server, the `insert` method can directly
accept a `FS.File`, too, but you must load data into it first.

## After the Upload

After the server receives the `FS.File` and all the corresponding binary file
data, it saves copies of the file in the stores that you specified.

If any storage adapters fail to save any of the copies in the
designated store, the server will periodically retry saving them. After a
configurable number of failed attempts at saving, the server will give up.

To configure the maximum number of save attempts, use the `maxTries` option
when creating your store. The default is 5.

## Storage Adapters

There are currently three available storage adapters, which are in separate
packages. Refer to the package documentation for usage instructions.

* [cfs-gridfs](https://github.com/CollectionFS/Meteor-cfs-gridfs): Allows you to save data to mongodb GridFS.
* [cfs-filesystem](https://github.com/CollectionFS/Meteor-cfs-filesystem): Allows you to save to the server filesystem.
* [cfs-s3](https://github.com/CollectionFS/Meteor-cfs-s3): Allows you to save to an Amazon S3 bucket.

Storage adapters also handle retrieving the file data and removing the file data
when you delete the file.

## File Manipulation

```js
  // Init a GridFS store:
  var gridfs = new FS.Store.GridFS('gridfsimages', {
    // We want to transform the writes to the store using streams:
    transformWrite: function(fileObj, readStream, writeStream) {

      // Transform the image into a 10x10px thumbnail
      this.gm(readStream, fileObj.name).resize('10', '10').stream().pipe(writeStream);

      // To pass it through:
      //readStream.pipe(writeStream);
    }     
  });
```
// TODO show an example of `transform` options on SA's and how they stream data.
> 
> You may want to manipulate files before saving them. For example, if a user
> uploads a large image, you may want to reduce its resolution, crop it,
> compress it, etc. before allowing the storage adapter to save it. You may also
> want to convert to another content type or change the filename.
> You can do all of this by defining a `beforeSave` method.
> 
> A `beforeSave` method can be defined for any store. It does not receive any
arguments, but its context is the
> `FS.File` being saved, which you can alter as necessary.
> 
> The most common scenario is image manipulation, and for this there is a
convenient package,
> [cfs-graphicsmagick](https://github.com/CollectionFS/Meteor-cfs-graphicsmagick),
> that allows you to easily call `GraphicsMagick` methods on the `FS.File`
data. Here's an example:
> 
> *server.js:*
> 
> ```js
> var imageStore = new FS.Store.FileSystem("images", {
>   path: "~/uploads",
>   beforeSave: function () {
>     this.gm().resize(60, 60).blur(7, 3).save();
>   }
> });
> 
> Images = new FS.Collection("images", {
>   stores: [imageStore]
> });
> ```
> 
> It's pretty easy to understand. First call `gm()` on the `FS.File` to enter
a special GraphicsMagick context, then call any methods from the node `gm` package,
and finally call `save()` to update the `FS.File` data with those modifications.
> Refer to the
> [cfs-graphicsmagick](https://github.com/CollectionFS/Meteor-cfs-graphicsmagick)
> package documentation for more information.

## Filtering

You may specify filters to allow (or deny) only certain content types,
file extensions, or file sizes in a FS.Collection. Use the `filter` option.

```js
Images = new FS.Collection("images", {
  filter: {
    maxSize: 1048576, //in bytes
    allow: {
      contentTypes: ['image/*'],
      extensions: ['png']
    },
    deny: {
      contentTypes: ['image/*'],
      extensions: ['png']
    },
    onInvalid: function (message) {
      alert(message);
    }
  }
});
```

To be secure, this must be added on the server; however, you should use the `filter`
option on the client, too, to help catch many of the disallowed uploads there
and allow you to display a helpful message with your `onInvalid` function.

You can mix and match filtering based on extension or content types.
The contentTypes array also supports "image/\*" and "audio/\*" and "video/\*"
like the "accepts" attribute on the HTML5 file input element.

If a file extension or content type matches any of those listed in allow,
it is allowed. If not, it is denied. If it matches both allow and deny,
it is denied. Typically, you would use only allow or only deny,
but not both. If you do not pass the `filter` option, all files are allowed,
as long as they pass the tests in your FS.Collection.allow() and
FS.Collection.deny() functions.

The extension checks are used only when there is a filename. It's possible to
upload a file with no name. Thus, you should generally use extension checks
only *in addition to* content type checks, and not instead of content type checks.

The file extensions must be specified without a leading period.

*Tip: You can do more advanced filtering in your `beforeSave` function.
If you return `false` from the `beforeSave` function for a store,
the file will never be saved in that store.*

## Security

File uploads and downloads can be secured using standard Meteor `allow`
and `deny` methods. To best understand how CollectionFS security works, you
must first understand that there are two ways in which a user could interact
with a file:

* She could view or edit information *about* the file or any
custom metadata you've attached to the file record.
* She could view or edit the *actual file data*.

You may find it necessary to secure file records with different criteria
from that of file data. This is easy to do.

Here's an overview of the various ways of securing various aspects of files:

* To determine who can *see* file metadata, such as filename, size, content type,
and any custom metadata that you set, use normal Meteor publish/subscribe
to publish and subscribe to an `FS.Collection` cursor. This does not allow the
user to *download* the file data.
* To determine who can *download* the actual file, use "download" allow/deny
functions. This is a custom type of allow/deny function provided by CollectionFS.
The first argument is the userId and the second argument is the FS.File being
requested for download.
* To determine who can *set* file metadata, insert files, and upload file data,
use "insert" allow/deny functions.
* To determine who can *set* file metadata, update files, and upload replacement
file data, use "update" allow/deny functions.
* To determine who can *remove* files, which removes all file data and file
metadata, use "remove" allow/deny functions.

### Securing Based on User Information

To secure a file based on a user "owner" or "role" or some other piece of custom
metadata, you must set this information on the file when originally inserting it.
You can then check it in your allow/deny functions.

```js
var fsFile = new FS.File(event.target.files[0]);
fsFile.metadata = {owner: Meteor.userId()};
fsCollection.insert(fsFile, function (err) {
  if (err) throw err;
});
```

## Using `insert` Properly

When you need to insert a file that's located on a client, always call 
`myFSCollection.insert` on the client. While you could define your own method,
pass it the `fsFile`, and call `myFSCollection.insert` on the server, the
difficulty is with getting the data from the client to the server. When you
pass the fsFile to your method, only the file *info* is sent and not the *data*.
By contrast, when you do the insert directly on the client, it automatically
chunks the file's data after insert, and then queues it to be sent chunk by
chunk to the server. And then there is the matter of recombining all those
chunks on the server and stuffing the data back into the fsFile. So doing
client-side inserts actually saves you all of this complex work, and that's
why we recommend it.

Calling insert on the server should be done only when you have the file
somewhere on the server filesystem already or you're downloading it from a
remote URL.

> ## Handlebars
> 
> To simplify your life, consider using the
[cfs-handlebars](https://github.com/CollectionFS/Meteor-cfs-handlebars) package, which provides
> several helpers to easily display `FS.File` information, create file inputs, create download or delete buttons, show file transfer progress, and more.

## Custom Connections

TODO move this to the transfer package readmes

To use a custom DDP connection for uploads or downloads, override the default
transfer queue with your own, passing in your custom connection:

```js
if (Meteor.isClient) {
  // There is a single uploads transfer queue per client (not per FS.Collection)
  FS.downloadQueue = new DownloadTransferQueue({ connection: DDP.connect(myUrl) });

  // There is a single downloads transfer queue per client (not per FS.Collection)
  FS.uploadQueue = new UploadTransferQueue({ connection: DDP.connect(myUrl) });
}
```

## Customizing the HTTP URLs and Headers

CollectionFS automatically mounts an HTTP access point that supports secure
GET and DEL requests for all FS.Collection instances.

To change the base URL for both GET and DEL requests:

*common.js*

```js
FS.HTTP.setBaseUrl('/files');
```

It's important to call this both on the server and on the client. Also be sure
that the resulting URL will not conflict with other resources.

To add custom headers for files returned by the GET endpoint:

*server.js or common.js*

```js
FS.HTTP.setHeadersForGet([
  ['Cache-Control', 'public, max-age=31536000']
]);
```

## Drag and Drop
Install the `ui-dropped-event` package. It adds the `dropped` event to the Meteor templates.

> Note the `FS.Utility.eachFile` utility function - it supports files from both `<input>` and `dropped` files.

Template
```html
  <div id="dropzone" class="dropzone">
    <div style="text-align: center; color: gray;">Drop file to upload</div>
  </div>
```

Javascript
```js
  Template.hello.events({
    // Catch the dropped event
    'dropped #dropzone': function(event, temp) {
      console.log('files droped');

      // If using the cfs api
      FS.Utility.eachFile(event, function(file) {
        var id = images.insert(file);
        console.log('Inserted file ');
        console.log(id);
      });
    }
  });
```

## Optimizing

* When you insert a file, a worker begins saving copies of it to all of the
stores you define for the collection. The copies are saved to stores in the
order you list them in the `stores` option array. Thus, you may want to prioritize
certain stores by listing them first. For example, if you have an images collection
with a thumbnail store and a large-size store, you may want to list the thumbnail
store first to ensure that thumbnails appear on screen as soon as possible after
inserting a new file. Or if you are storing audio files, you may want to prioritize
a "sample" store over a "full-length" store.

## Example Code

The following code examples will get you started with common tasks.

### Insert One File From File Input

In client code:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    var files = event.target.files;
    Images.insert(files[0], function (err, fileObj) {
      //if !err, fileObj is now in the Images collection and its data is being uploaded
    });
  }
});
```

### Insert Multiple Files From Multiple File Input

In client code:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    var files = event.target.files;
    for (var i = 0, ln = files.length; i < ln; i++) {
      Images.insert(files[i], function (err, fileObj) {
        //if !err, fileObj is now in the Images collection and its data is being uploaded
      });
    }
  }
});
```

### Insert One File From Drop Zone

TODO add

### Insert Multiple Files From Drop Zone

TODO add

### Insert One File From a Remote URL
// TODO this api changed patter, use `attachData` or direct insert to `FS.Collection`
> 
> In either client or server code:
> 
> ```js
> Pictures.insert(url, function (error, fileObj) {
>   //fileObj is the inserted FS.File instance
>   //data has been automatically retrieved from the remote URL and stored
> });
> ```
> 
> On the server, you can omit the callback and the method will block until the
data download and insert are both complete. Then it will return the new FS.File
instance. On the client, you can omit the callback and any errors will be thrown.
> 
> When you call `insert` with a URL string as the first argument on the client,
the remote data download and the actual insert both take place on the server.
This is helpful for lightweight clients and also avoids CORS issues. When this
happens, the callback will still be called after the remote download and insert
is finished, but the return value of `insert` will always be `undefined` (because
the insert did not happen on the client).
> 
> Note that a drawback of passing the URL directly to `insert` is that the file
will be inserted without a name. If you want to give it a name, you can do it
this way:
> 
> ```js
> FS.File.fromUrl(url, 'name.jpg', function (error, fileObj) {
>   //data has been automatically retrieved from the remote URL and attached to fileObj
>   Pictures.insert(fileObj, function (error, fileObj) {
>     //fileObj._id is now set
>   });
> });
> ```
> 
> Or in server code:
> 
> ```js
> var fileObj = FS.File.fromUrl(url, 'name.jpg');
> Pictures.insert(fileObj);
> //fileObj._id is now set
> ```
> 
> Note that `FS.File.fromUrl` will not work on the client if the remote resource's
> CORS header does not allow the download.

### Add Metadata to a File Before Inserting

TODO add

### Update Existing File's Metadata

Knowing the file's `_id`, you can call `update` on the `FS.Collection` instance:

```js
myFSCollection.update({_id: fileId}, {$set: {'metadata.foo': 'bar'}});
```

If you have the `FS.File` instance, you can call `update` on it:

```js
myFsFile.update({$set: {'metadata.foo': 'bar'}});
```

### Store a Reference to an Inserted File in Another Collection

> We can insert `FS.Files` directly into the `Meteor.Collection` due to `cfs-ejson-file` package.
> 
> This works in either client or server code:
> 
> ```js
> Pictures.insert(myFile, function (error, fileObj) {
>   if (!error) {
>     Items.update({_id: relatedItemId}, {$set: {pictureId: fileObj._id}});
>   } else {
>     throw error;
>   }
> });
> ```
> 
> This works in server code only:
> 
> ```js
> var fileObj = Pictures.insert(myFile);
> Items.update({_id: relatedItemId}, {$set: {pictureId: fileObj._id}});
> ```
