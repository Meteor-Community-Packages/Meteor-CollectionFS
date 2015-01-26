CollectionFS
============
File Managing System for Meteor

# cfs:standard-packages (pre1) [![Build Status](https://travis-ci.org/CollectionFS/Meteor-CollectionFS.png?branch=master)](https://travis-ci.org/CollectionFS/Meteor-CollectionFS)

NOTE: This branch is under active development right now (2014-12-06). It has

bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

If you have Documentation feedback/requests please post on [issue 206](https://github.com/CollectionFS/Meteor-CollectionFS/issues/206)

CollectionFS is a smart package for Meteor that provides a complete file
management solution including uploading, downloading, storage, synchronization,
manipulation, and copying. It supports several storage adapters for saving to
the local filesystem, GridFS, or S3, and additional storage adapters can be
created.

## Installation

**Only Meteor 0.9.0 and later are currently supported**

```bash
$ cd <app dir>
$ meteor add cfs:standard-packages
$ meteor add cfs:filesystem # Storage Adapter / SA
$ meteor add <CFS add-on packages>
``` 

You must add `cfs:standard-packages`, which is the main package, and at least one storage adapter package. See the Storage Adapters section for a list of the available storage adapter packages. At least `cfs:gridfs` or `cfs:filesystem` must be added, too. The temporary store requires one of them.

Depending on what you need to do, you may need to add additional add-on packages. These are explained in the documentation sections to which they apply.

### Converting From Pre-0.9.0 Meteor

1. Delete `packages` folder from your app, or at least remove all the CFS-related packages from it.
2. Delete the `smart.json` that lists the CFS packages, or at least delete all CFS-related packages from it.
3. `meteor remove <pkgname>` for any CFS packages shown when you do `meteor list`.
4. Follow the installation instructions above.

If it does not use v0.0.1+ of `cfs:tempstore` and `cfs:power-queue` (Meteor issue meteor/meteor#2526), then `meteor add` those package versions yourself, but you will eventually want to remove those from your app and let `cfs:standard-packages` manage them.

## Introduction

The CollectionFS package makes available two important global variables:
`FS.File` and `FS.Collection`.

* An `FS.File` instance wraps a file and its data
on the client or server. It is similar to the browser `File` object (and can be
created from a `File` object), but it has additional properties and methods. Many of its methods are reactive when the instance is returned by a call to `find` or `findOne`.
* An `FS.Collection` provides a collection in which information about 
files can be stored. It is backed by an underlying normal `Mongo.Collection` instance. Most collection methods, such as `find` and `insert` are available on the `FS.Collection` instance. If you need to call other collection methods such as `_ensureIndex`, you can call them directly on the underlying `Mongo.Collection` instance available through `myFSCollection.files`.

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
also told it to store the files in `~/uploads` on the local filesystem. If you
don't specify a `path`, a `cfs/files` folder in your app container (bundle directory)
will be used.

Your FS.Collection and FS.Store variables do not necessarily have to be
global on the client or the server, but be sure to give them the same name
(the first argument in each constructor) on both the client and the server.

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

## Inserting a File on the Server

In certain circumstances, however, it might be necessary to perform inserts on
the server.  The following example demonstrates the steps required to handle a
`Buffer`:

```javascript
var request = Meteor.require('request');

request.get({url: url, encoding: null}, Meteor.bindEnvironment(function(e, r, buffer){
  var newFile = new FS.File();
  newFile.attachData(buffer, {type: 'image/png'}, function(error){
      if(error) throw error;
      newFile.name('myGraphic.png');
      
      Images.insert(newFile);
  });
})).auth(null, null, true, accessToken);
```

When calling [attachData()](https://github.com/CollectionFS/Meteor-cfs-file/blob/master/api.md#fsfileattachdatadata-options-callbackanywhere)
with a `Buffer`, you must provide the MIME type of the file through the second argument as shown above.  Omitting this
argument yields an exception:

```
Error: DataMan constructor requires a type argument when passed a Buffer
```

Further examples can be found [here](https://github.com/CollectionFS/Meteor-cfs-file/blob/master/tests/file-tests.js#L123).

Caveats:

* Downloading large files into a `Buffer` could potentially lead to memory issues.
* Use of external HTTP library to make authenticated requests will be unnecessary once [issue 350](https://github.com/CollectionFS/Meteor-CollectionFS/issues/350)
is resolved.
 

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

* [cfs:gridfs](https://github.com/CollectionFS/Meteor-cfs-gridfs): Allows you to save data to mongodb GridFS.
* [cfs:filesystem](https://github.com/CollectionFS/Meteor-cfs-filesystem): Allows you to save to the server filesystem.
* [cfs:s3](https://github.com/CollectionFS/Meteor-cfs-s3): Allows you to save to an Amazon S3 bucket.

Storage adapters also handle retrieving the file data and removing the file data
when you delete the file.

## File Manipulation
 
You may want to manipulate files before saving them. For example, if a user
uploads a large image, you may want to reduce its resolution, crop it,
compress it, etc. before allowing the storage adapter to save it. You may also
want to convert to another content type or change the filename or encrypt
the file. You can do all of this by defining stream transformations on a
store.

> Note: At the moment transform only work on the server-side code - this could change before released

### transformWrite/transformRead

The most common type of transformation is a "write" transformation, that is,
a function that changes the data as it is initially stored. You can define
this function using the `transformWrite` option on any store constructor. If the
transformation requires a companion transformation when the data is later read
out of the store (such as encrypt/decrypt), you can define a `transformRead`
function as well.

For illustration purposes, here is an example of a `transformWrite` function that doesn't do anything:

```js
transformWrite: function(fileObj, readStream, writeStream) {
  readStream.pipe(writeStream);
}
```

The important thing is that you must pipe the `readStream` to the `writeStream` before returning from the function. Generally you will manipulate the stream in some way before piping it.

### beforeWrite

Sometimes you also need to change a file's metadata before it is saved to a particular store. For example, you might have a `transformWrite` function that changes the file type, so you need a `beforeWrite` function that changes the extension and content type to match.

The simplest type of `beforeWrite` function will return an object with `extension`, `name`, or `type` properties. For example:

```js
beforeWrite: function (fileObj) {
  return {
    extension: 'jpg',
    type: 'image/jpg'
  };
}
```

This would change the extension and type for that particular store.

Since `beforeWrite` is passed the `fileObj`, you can optionally alter that directly. For example, the following would be the same as the previous example assuming the store name is "jpegs":

```js
beforeWrite: function (fileObj) {
  fileObj.extension('jpg', {store: "jpegs", save: false});
  fileObj.type('image/jpg', {store: "jpegs", save: false});
}
```

(It's best to provide the `save: false` option to any of the setters you call in `beforeWrite`.) 

## Image Manipulation

A common use for `transformWrite` is to manipulate images before saving them.
To get this set up:

1. Install [GraphicsMagick](http://www.graphicsmagick.org/) or [ImageMagick](http://www.imagemagick.org/script/index.php) on your development machine and on any server that will host your app. (The free Meteor deployment servers do not have either of these, so you can't deploy to there.) These are normal operating system applications, so you have to install them using the correct method for your OS. For example, on Mac OSX you can use `brew install graphicsmagick` assuming you have Homebrew installed.
2. Add the `cfs:graphicsmagick` Meteor package to your app: `meteor add cfs:graphicsmagick`

The following are some examples.

### Basic Example

```js
Images = new FS.Collection("images", {
    stores: [
      new FS.Store.FileSystem("images"),
      new FS.Store.FileSystem("thumbs", {
        transformWrite: function(fileObj, readStream, writeStream) {
          // Transform the image into a 10x10px thumbnail
          gm(readStream, fileObj.name()).resize('10', '10').stream().pipe(writeStream);
        }
      })
    ],
    filter: {
      allow: {
        contentTypes: ['image/*'] //allow only images in this FS.Collection
      }
    }
});
```

*Note that this example requires the `cfs:filesystem` package.*

### Converting to a Different Image Format

To convert every file to a specific image format, you can pass a [GraphicsMagick format string](http://www.graphicsmagick.org/formats.html) to the `stream` method, but you will also need to alter the `FS.File` instance as necessary in a `beforeWrite` function.

```js
Images = new FS.Collection("images", {
    stores: [
      new FS.Store.FileSystem("images"),
      new FS.Store.FileSystem("thumbs", {
        beforeWrite: function(fileObj) {
          // We return an object, which will change the
          // filename extension and type for this store only.
          return {
            extension: 'png',
            type: 'image/png'
          };
        },
        transformWrite: function(fileObj, readStream, writeStream) {
          // Transform the image into a 10x10px PNG thumbnail
          gm(readStream).resize(60).stream('PNG').pipe(writeStream);
          // The new file size will be automatically detected and set for this store
        }
      })
    ],
    filter: {
      allow: {
        contentTypes: ['image/*'] //allow only images in this FS.Collection
      }
    }
});
```

*Note that this example requires the `cfs-filesystem` package.*

### Converting a File Already Stored

You may want to adjust a bunch of images that you've already stored. This can be done easily by streaming out of the store and then back into it. The following example is for illustration purposes, but you should not use it on production data unless you have a throttled queue in a separate process or only a very small number of images.

```js
Images.find().forEach(function (fileObj) {
  var readStream = fileObj.createReadStream('images');
  var writeStream = fileObj.createWriteStream('images');
  gm(readStream).swirl(180).stream().pipe(writeStream);
});
```

Note that you could also pipe the readStream from one store to the writeStream from another store to move files between stores, for example if you decide to use a different storage adapter and need to quickly and easily migrate the data. (We have not tested this, but it should be possible.)

## An FS.File Instance

An `FS.File` instance is an object with properties similar to this:

```js
{
  _id: '',
  collectionName: '', // this property not stored in DB
  collection: collectionInstance, // this property not stored in DB
  createdByTransform: true, // this property not stored in DB
  data: data, // this property not stored in DB
  original: {
    name: '',
    size: 0,
    type: '',
    updatedAt: date 
  },
  copies: {
    storeName: {
      key: '',
      name: '',
      size: 0,
      type: '',
      createdAt: date,
      updatedAt: date 
    }
  },
  uploadedAt: date,
  anyUserDefinedProp: anything
}
```

But `name`, `size`, `type`, and `updatedAt` should be retrieved and set with the methods rather than directly accessing the props:

```js
// get original
fileObj.name();
fileObj.extension();
fileObj.size();
fileObj.formattedSize(); // must add the "numeral" package to your project to use this method
fileObj.type();
fileObj.updatedAt();

// get for the version in a store
fileObj.name({store: 'thumbs'});
fileObj.extension({store: 'thumbs'});
fileObj.size({store: 'thumbs'});
fileObj.formattedSize({store: 'thumbs'}); // must add the "numeral" package to your project to use this method
fileObj.type({store: 'thumbs'});
fileObj.updatedAt({store: 'thumbs'});

// set original
fileObj.name('pic.png');
fileObj.extension('png');
fileObj.size(100);
fileObj.type('image/png');
fileObj.updatedAt(new Date);

// set for the version in a store
fileObj.name('pic.png', {store: 'thumbs'});
fileObj.extension('png', {store: 'thumbs'});
fileObj.size(100, {store: 'thumbs'});
fileObj.type('image/png', {store: 'thumbs'});
fileObj.updatedAt(new Date, {store: 'thumbs'});
```

These methods can all be used as UI helpers, too:

```html
{{#each myFiles}}
  <p>Original name: {{this.name}}</p>
  <p>Original extension: {{this.extension}}</p>
  <p>Original type: {{this.type}}</p>
  <p>Original size: {{this.size}}</p>
  <p>Thumbnail name: {{this.name store="thumbs"}}</p>
  <p>Thumbnail extension: {{this.extension store="thumbs"}}</p>
  <p>Thumbnail type: {{this.type store="thumbs"}}</p>
  <p>Thumbnail size: {{this.size store="thumbs"}}</p>
{{/each}}
```

Also, rather than setting the `data` property directly, you should use the `attachData` method.

[Check out the full public API for `FS.File`](https://github.com/CollectionFS/Meteor-cfs-file/blob/master/api.md).

### Storing FS.File references in your objects

**_NOTE:_**
_At the moment storing FS.File - References in MongoDB on the server side doesn't work. See eg. (https://github.com/CollectionFS/Meteor-cfs-ejson-file/issues/1) (https://github.com/CollectionFS/Meteor-CollectionFS/issues/356)
(https://github.com/meteor/meteor/issues/1890)._

_Instead store the _id's of your file objects and then fetch the FS.File-Objects from your CollectionFS - Collection._

Often your files are part of another entity. You can store a reference to the file directly in the entity.
You need to add `cfs:ejson-file` to your packages with `meteor add cfs:ejson-file`.
Then you can do for example:

```js
// Add file reference of the event photo to the event
var file = $('#file').get(0).files[0];
var fileObj = eventPhotos.insert(file);
events.insert({
  name: 'My Event',
  photo: fileObj
});

// Later: Retrieve the event with the photo
var event = events.findOne({name: 'My Event'});
// This loads the data of the photo into event.photo
// You can include it in your collection transform function.
event.photo.getFileRecord();
```

[Demo app](https://github.com/Sanjo/collectionFS_test/tree/ejson-file-reference)

You need to ensure that the client is subscribed to the related photo document, too.
There are packages on atmosphere, such as
[publish-with-relations](https://atmospherejs.com/package/publish-with-relations) and
[smart-publish](https://atmospherejs.com/package/smart-publish), that attempt to make this easy.

UPD You can use [Meteor.publish](http://docs.meteor.com/#/full/meteor_publish):
```javascript
// publish dependent documents and simulate joins
Meteor.publish("roomAndMessages", function (roomId) {
  check(roomId, String);
  return [
    Rooms.find({_id: roomId}, {fields: {secretInfo: 0}}),
    Messages.find({roomId: roomId})
  ];
});
```

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
      if (Meteor.isClient) {
        alert(message);
      } else {
        console.log(message);
      }
    }
  }
});
```

Alternatively, you can pass your filters object to `myFSCollection.addFilters()`.

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

The file extensions must be specified without a leading period. Extension matching
is case-insensitive.

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
* To determine who can *update* file metadata, use "update" allow/deny functions.
* To determine who can *remove* files, which removes all file data and file
metadata, use "remove" allow/deny functions.

The `download` allow/deny functions can be thought of essentially as allowing or
denying "read" access to the file. For a normal Meteor collection, "read" access
is defined through pub/sub, but we don't want to send large amounts of binary file
data to each client just because they subscribe to the file record. Thus with CFS,
pub/sub will get you the file's metadata on the client whereas an HTTP request to the
GET URL is required to view or download the file itself. The `download` allow/deny
determines whether this HTTP request will respond with "Access Denied" or not.

### Securing Based on User Information

To secure a file based on a user "owner" or "role" or some other piece of custom
metadata, you must set this information on the file when originally inserting it.
You can then check it in your allow/deny functions.

```js
var fsFile = new FS.File(event.target.files[0]);
fsFile.owner = Meteor.userId();
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

There are two types of UI helpers available. First, some of the `FS.File`
instance methods will work when called in templates, too. These are available
to you automatically and are documented here. Second, some additional useful helpers are provided
in the optional [cfs-ui](https://github.com/CollectionFS/Meteor-cfs-ui) package.
These make it easy to render a delete button or an upload progress bar
and more. Refer to the `cfs-ui` readme.

### FS.File Instance Helper Methods

Some of the FS.File API methods are designed to be usable as UI helpers.

### url

Returns the HTTP file URL for the current FS.File.

Use with an `FS.File` instance as the current context.

Specify a `store` attribute to get the URL for a specific store. If you don't
specify the store name, the URL will be for the copy in the first defined store.

```html
{{#each images}}
  URL: {{this.url}}
  <img src="{{this.url store='thumbnail'}}" alt="thumbnail">
{{/each}}
```

This is actually using the [url method](https://github.com/CollectionFS/Meteor-cfs-access-point/blob/master/api.md#fsfileurloptionsanywhere), which is added to the `FS.File` prototype by the `cfs:access-point` package. You can use any of the options mentioned in the API documentation, and you can call it from client and server code.

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
  newFile.name("newImage.png");
  Images.insert(newFile, function (error, fileObj) {
    //If !error, we have inserted new doc with ID fileObj._id, and
    //remote URL data will be downloaded and stored on the server. The
    //URL must support a HEAD request since we do one to get the 
    //content type, size, etc. for filtering inserts.
  });
});
```

### Add Custom Metadata to a File Before Inserting

You can set any additional properties on your file object before inserting. To avoid conflicts with built-in properties and method names, you may want to group them in one object property, like `metadata`. For example,
with a file input:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    FS.Utility.eachFile(event, function(file) {
      var newFile = new FS.File(file);
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

### Display an Uploaded Image

Create a helper that returns your image files:

```js
Template.imageView.helpers({
  images: function () {
    return Images.find(); // Where Images is an FS.Collection instance
  }
});
```

Use the `url` method with an `img` element in your markup:

```html
<template name="imageView">
  <div class="imageView">
    {{#each images}}
      <div>
        <a href="{{this.url}}" target="_blank"><img src="{{this.url store='thumbs' uploading='/images/uploading.gif' storing='/images/storing.gif'}}" alt="" class="thumbnail" /></a>
      </div>
    {{/each}}
  </div>
</template>
```

Notes:
* `{{this.url}}` will assume the first store in your `stores` array. In this example, we're displaying the image from the "thumbs" store but wrapping it in a link that will load the image from the primary store (for example, the original image or a large image).
* The `uploading` and `storing` options allow you to specify a static image that will be shown in place of the real image while it is being uploaded and stored. You can alternatively use `if` blocks like `{{#if this.isUploaded}}` and `{{#if this.hasStored 'thumbs'}}` to display something different until upload and storage is complete.
* These helpers are actually just instance methods on the `FS.File` instances, so there are others you can use, such as `this.isImage`. See [the API documentation](https://github.com/CollectionFS/Meteor-cfs-file/blob/master/api.md). The `url` method is documented separately [here](https://github.com/CollectionFS/Meteor-cfs-access-point/blob/master/api.md#fsfileurloptionsanywhere).


### Provide a Download Button

Create a helper that returns your files:

```js
Template.fileList.helpers({
  files: function () {
    return Files.find();
  }
});
```

Use the `url` method with `download` option in your markup:

```html
<template name="fileList">
  <div class="fileList">
    {{#each files}}
      <div class="file">
        <strong>{{this.name}}</strong> <a href="{{this.url download=true}}" class="btn btn-primary">Download</a>
      </div>
    {{/each}}
  </div>
</template>
```
