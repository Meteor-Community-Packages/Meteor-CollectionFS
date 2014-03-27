#CollectionFS (pre1) [![Build Status](https://travis-ci.org/CollectionFS/Meteor-CollectionFS.png?branch=master)](https://travis-ci.org/CollectionFS/Meteor-CollectionFS)

NOTE: This branch is under active development right now (2014-3-24). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

If you have Documentation feedback/requests please post on [issue 206](https://github.com/CollectionFS/Meteor-CollectionFS/issues/206)

CollectionFS is a smart package for Meteor that provides a complete file
management solution including uploading, downloading, storage, synchronization,
manipulation, and copying. It supports several storage adapters for saving to
the local filesystem, GridFS, or S3, and additional storage adapters can be
created.

## Installation

Install Meteorite, if you have not yet done so, and then:

```bash
$ cd <app dir>
$ mrt add collectionFS
$ mrt add <storage adapter package>
$ mrt add <CFS add-on packages>
``` 

You must add `collectionFS`, which is the main package, and at least one storage
adapter package. See the Storage Adapters section for a list of the available
storage adapter packages. Depending on what you need to do, you may need to add
additional add-on packages. These are explained in the documentation sections
to which they apply.

To pull down the most recent updates to every package,
just run `mrt update` again at any time. If you're having trouble, you can
alternatively try cloning [this repo](https://github.com/copleykj/CollectionFS-Demo).

> Make sure your `smart.json` says `"collectionFS": {}` *pointing to the latest version*

### Using the Old API

Adding the `collectionFS` package currently gives you the 0.4.x release, which is
the new API documented here and in development on the `devel` branch. This API is
fairly stable and allows you to do much more than the old API, but it currently
lacks complete tests and may change a bit prior to the `1.0` release. If you prefer
to use the old API, edit your app's `smart.json` so that the `collectionFS` line
looks like this:

```js
 "packages": {
   "collectionFS": "0.3.7"
 }
```

If you have tried the new API, you can remove any other CFS packages that might be
in your `smart.json` file. Then run the following commands:

```bash
$ cd <app dir>
$ mrt update
$ meteor add collectionFS
```

You must call `meteor add` for all packages that you manually added to `smart.json`.

## Introduction

The CollectionFS package makes available two important global variables:
`FS.File` and `FS.Collection`.

* A `FS.File` wraps a file and its data
on the client or server. It is similar to the browser `File` object (and can be
created from a `File` object), but it has additional properties and methods.
* A `FS.Collection` provides a collection in which information about 
files can be stored.

A document from a `FS.Collection` is represented as a `FS.File`.

CollectionFS also provides an HTTP upload package that has the necessary
mechanisms to upload files, track upload progress reactively, and pause and
resume uploads. This can be swapped for a DDP upload package, but we do
not currently recommend using DDP for uploads due to known issues with
the current DDP spec and large files.

## Getting Started

The first step in using this package is to define a `FS.Collection`.

*common.js:*

```js
var Images = new FS.Collection("images", {
  stores: [new FS.Store.FileSystem("images", {path: "~/uploads"})]
});
```

In this example, we've defined a FS.Collection named "images", which will
be a new collection in your MongoDB database with the name "cfs.images.filerecord". We've
also told it to store the files in `~/uploads` on the local filesystem.

Your FS.Collection variable does not necessarily have to be global on the
client or the server, but be sure to give it the same name (the first argument)
on both the client and the server.

_If you're using a storage adapter that requires sensitive information such as
access keys, we recommend supplying that information using environment variables.
If you instead decide to pass options to the storage adapter constructor,
then be sure that you do that only in the server code (and not simply within a
`Meteor.isServer` block)._

Now we can upload a file from the client. Here is an example of doing so from
the change event handler of an HTML file input:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    var files = event.target.files;
    for (var i = 0, ln = files.length; i < ln; i++) {
      Images.insert(files[i], function (err, fileObj) {
        //Inserted new doc with ID fileObj._id, and kicked off the data upload using HTTP
      });
    }
  }
});
```

You can optionally make this code a bit cleaner by using a provided utility
method, `FS.Utility.eachFile`:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    FS.Utility.eachFile(event, function(file) {
      Images.insert(file, function (err, fileObj) {
        //Inserted new doc with ID fileObj._id, and kicked off the data upload using HTTP
      });
    });
  }
});
```

Notice that the only thing we're doing is passing the browser-provided `File`
object to `Images.insert()`. This will create a `FS.File` from the
`File`, link it with the `Images` FS.Collection, and then immediately
begin uploading the data to the server with reactive progress updates.

The `insert` method can directly accept a variety of different file
representations as its first argument:

* `File` object (client only)
* `Blob` object (client only)
* `Uint8Array`
* `ArrayBuffer`
* `Buffer` (server only)
* A full URL that begins with "http:" or "https:"
* A local filepath (server only)
* A data URI string

Where possible, streams are used, so in general you should avoid using any
of the buffer/binary options unless you have no choice, perhaps because you
are generating small files in memory.

The most common usage is to pass a `File` object on the client or a URL on
either the client or the server. Note that when you pass a URL on the client,
the actual data download from that URL happens on the server, so you don't
need to worry about CORS. In fact, we recommend doing all inserts on the
client (managing security through allow/deny), unless you are generating
the data on the server.

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
 
You may want to manipulate files before saving them. For example, if a user
uploads a large image, you may want to reduce its resolution, crop it,
compress it, etc. before allowing the storage adapter to save it. You may also
want to convert to another content type or change the filename or encrypt
the file. You can do all of this by defining stream transformations on a
store.

The most common type of transformation is a "write" transformation, that is,
a function that changes the data as it is initially stored. You can define
this function using the `transformWrite` option on any store constructor.
Here is an example:

```js
  // Init a GridFS store:
  var gridfs = new FS.Store.GridFS('gridfsimages', {
    // We want to transform the writes to the store using streams:
    transformWrite: function(fileObj, readStream, writeStream) {

      // Transform the image into a 10x10px thumbnail
      this.gm(readStream, fileObj.name).resize('10', '10').stream().pipe(writeStream);

      // To pass it through:
      //readStream.pipe(writeStream);
      
      // You can also change the fileObj before storing it
      //fileObj.update({$set: {name: 'newname.png'}});
    }     
  });
```

Note the we provide the node `gm` package on `this` within a transform function.
You could also use any other node package that can transform streams. If the
transformation requires a companion transformation when the data is later read
out of the store (such as encrypt/decrypt), you can define a `transformRead`
function as well.

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

Note that you will want to verify this `owner` metadata in a `deny` function
since the client could put any user ID there.

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
somewhere on the server filesystem already or you're generating the data
on the server.

## UI Helpers

Some of the API methods are designed to be usable as UI helpers.

### FS.File Instance Helper Methods

### url

Returns the HTTP file URL for the current FS.File.

Use with an `FS.File` instance as the current context.

Specify a `store` attribute to get the URL for a specific store. If you don't
specify the store name, the URL will be for the copy in the first defined store.

```html
{{#each images}}
  URL: {{url}}
  <img src="{{url store='thumbnail'}}" alt="thumbnail">
{{/each}}
```

### isImage

Returns true if the copy of this file in the specified store has an image
content type. If the file object is unmounted or was not saved in the specified
store, the content type of the original file is checked instead.

Use with an `FS.File` instance as the current context.

```html
{{#if isImage}}
{{/if}}
{{#if isImage store='thumbnail'}}
{{/if}}
```

### isAudio

Returns true if the copy of this file in the specified store has an audio
content type. If the file object is unmounted or was not saved in the specified
store, the content type of the original file is checked instead.

Use with an `FS.File` instance as the current context.

```html
{{#if isImage}}
{{/if}}
{{#if isImage store='thumbnail'}}
{{/if}}
```

### isVideo

Returns true if the copy of this file in the specified store has a video
content type. If the file object is unmounted or was not saved in the specified
store, the content type of the original file is checked instead.

Use with an `FS.File` instance as the current context.

```html
{{#if isImage}}
{{/if}}
{{#if isImage store='thumbnail'}}
{{/if}}
```

### isUploaded

Returns true if all the data for the file has been successfully received on the
server. It may not have been stored yet.

Use with an `FS.File` instance as the current context.

```html
{{#with fileObj}}
{{#if isUploaded}}
{{/if}}
{{/with}}
```

## Customizing the HTTP URLs and Headers

CollectionFS automatically mounts an HTTP access point that supports secure
GET, PUT, HEAD, and DELETE requests for all FS.Collection instances.

To change the base URL for the endpoints:

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

### Insert One or More Files From File Input

In client code:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    FS.Utility.eachFile(event, function(file) {
      Images.insert(file, function (err, fileObj) {
        //If !err, we have inserted new doc with ID fileObj._id, and
        //kicked off the data upload using HTTP
      });
    });
  }
});
```

Note that this works regardless of whether the file input accepts multiple files.

### Insert One Or More Files Dropped on an Element

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
    console.log('files dropped');
    FS.Utility.eachFile(event, function(file) {
      Images.insert(file, function (err, fileObj) {
        //If !err, we have inserted new doc with ID fileObj._id, and
        //kicked off the data upload using HTTP
      });
    });
  }
});
```

### Insert One File From a Remote URL
 
In either client or server code:

```js
Images.insert(url, function (error, fileObj) {
  //If !error, we have inserted new doc with ID fileObj._id, and
  //remote URL data will be downloaded and stored on the server. The
  //URL must support a HEAD request since we do one to get the 
  //content type, size, etc. for filtering inserts.
});
```

On the server, you can omit the callback and the method will block until the
data download and insert are both complete. Then it will return the new FS.File
instance.

```js
var newFileObj = Images.insert(url);
```

On the client, you can omit the callback if you don't need to
access the resulting FS.File instance, and any errors will be thrown.

When you pass a URL directly to `insert`, the filename will be extracted
from the end of the URL string, but only if it ends with an extension. Otherwise
filename will be null. If you want to avoid a null filename, you will have to
explicitly attach the URL to a new FS.File instance and set the `name`:

```js
var newFile = new FS.File();
newFile.attachData(url, function (error) {
  if (error) throw error;
  newFile.name = "newImage.png";
  Images.insert(newFile, function (error, fileObj) {
    //If !error, we have inserted new doc with ID fileObj._id, and
    //remote URL data will be downloaded and stored on the server. The
    //URL must support a HEAD request since we do one to get the 
    //content type, size, etc. for filtering inserts.
  });
});
```

### Add Custom Metadata to a File Before Inserting

Set the `metadata` property to your custom metadata object before inserting. For example,
with a file input:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    FS.Utility.eachFile(event, function(file) {
      var newFile = new FS.File(file);
      newFile.attachData(file);
      newFile.metadata = {foo: "bar"};
      Images.insert(newFile, function (err, fileObj) {
        //If !err, we have inserted new doc with ID fileObj._id, and
        //kicked off the data upload using HTTP
      });
    });
  }
});
```

### Update Existing File's Metadata

Knowing the file's `_id`, you can call `update` on the `FS.Collection` instance:

```js
myFSCollection.update({_id: fileId}, {$set: {'metadata.foo': 'bar'}});
```

If you have the `FS.File` instance, you can call `update` on it:

```js
myFsFile.update({$set: {'metadata.foo': 'bar'}});
```
