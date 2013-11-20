CollectionFS
=========================

NOTE: This branch is under active development right now (2013-11-18). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

CollectionFS is a smart package for Meteor that provides a complete file
management solution including uploading, downloading, storage, synchronization,
manipulation, and copying. It supports several storage adapters for saving to
the local filesystem, GridFS, or S3, and additional storage adapters can be
created.

## Installation

NOTE: For testing, use this in smart.json:

```js
"collectionFS": {
  "git": "https://github.com/CollectionFS/Meteor-CollectionFS.git",
  "branch": "devel-merge"
}
```

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add collectionFS
```

You may need to add additional packages depending on how you are using
CollectionFS. Continue reading for details.

## Introduction

The CollectionFS package makes available two important global variables:
`FileObject` and `CollectionFS`.

* A `FileObject` wraps a file and its data
on the client or server. It is similar to the browser `File` object (and can be
created from a `File` object), but it has additional properties and methods.
* A `CollectionFS` provides a collection in which information about 
files can be stored. It also provides
the necessary mechanisms to upload and download the files, track
upload and download progress reactively, pause and resume uploads and downloads,
and more.

A document from a `CollectionFS` is represented as a `FileObject`.

## Getting Started

The first step in using this package is to define a `CollectionFS`.

*client.js:*

```js
var Images = new CollectionFS("images");
```

*server.js:*

```js
var Images = new CollectionFS("images", {
  useHTTP: true,
  store: new CollectionFS.FileSystemStore("images", "~/uploads")
});
```

In this example, we've defined a CollectionFS named "images", which will
be a new collection in your MongoDB database with the name "images.files". We've
also told it to store the files in `~/uploads` on the local filesystem.

Your CollectionFS variable does not necessarily have to be global on the
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

Notice that the only thing we're doing is passing the browser-provided `File`
object to `Images.insert()`. This will create a `FileObject` from the
`File`, link it with the `Images` CollectionFS, and then immediately
begin uploading the data to the server with reactive progress updates.

On both the client and the server, the `insert` method can directly
accept a `FileObject`, too, but you must load a buffer or blob into it first.

## After the Upload

After the server receives the `FileObject` and all the corresponding binary file
data, it saves the master copy of the file in the store that you specified. Then
it saves any additional copies that you've requested, for example, image thumbnails.

If any storage adapters fail to save the master or any of the copies in the
designated store, the server will periodically retry saving them. After a
configurable number of failed attempts at saving, the server will give up. At
this point, if the master copy has still not been saved, the `FileObject` will
be deleted from the CollectionFS.

To configure the maximum number of save attempts, use the `maxTries` option. You
can specify this for the master copy and/or for any of the additional copies. The
default is 5.

## Storage Adapters

There are currently three available storage adapters, which are in separate
packages. Refer to the package documentation for usage instructions.

* `cfs-gridfs`: Allows you to save data chunks into `Meteor.Collection`s that follow the GridFS spec.
* `cfs-filesystem`: Allows you to save to the server filesystem.
* `cfs-s3`: Allows you to save to an Amazon S3 bucket.

Storage adapters also handle retrieving the file data and removing the file data
when you delete the file. Some of them support synchronization, where updates
to the master store are automatically synchronized with the linked CollectionFS.

## File Manipulation

You may want to manipulate files before saving them. For example, if a user
uploads a large image, you may want to reduce its resolution, crop it,
compress it, etc. before allowing the storage adapter to save it. You may also
want to convert to another content type or change the filename. You can do all
of this by defining a `beforeSave` method.

A `beforeSave` method can be defined for the master copy and/or for any of the
additional copies. It does not receive any arguments, but its context is the
`FileObject` being saved, which you can alter as necessary.

The most common scenario is image manipulation, and for this there is a convenient
package, `cfs-graphicsmagick` that allows you to easily call `GraphicsMagick` methods on the `FileObject`
data. Here's an example:

```js
Images = new CollectionFS("images", {
  store: new CollectionFS.FileSystemStore("images", "~/uploads"),
  beforeSave: function () {
    this.gm().resize(60, 60).blur(7, 3).save();
  }
});
```

It's pretty easy to understand. First call `gm()` on the `FileObject` to enter
a special GraphicsMagick context, then call any methods from the node `gm` package,
and finally call `save()` to update the `FileObject` data with those modifications.
Refer to the `cfs-graphicsmagick` package documentation for more information.

## Filtering

You may specify filters to allow (or deny) only certain content types, file extensions,
or file sizes in a CollectionFS. Use the `filter` option.

```js
Images = new CollectionFS("images", {
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

To be secure, this must be added on the server; however, using the `filter`
option on the client will help catch many of the disallowed uploads there,
allowing you to display a helpful message with your `onInvalid` function.

You can mix and match filtering based on extension or content types.
The contentTypes array also supports "image/\*" and "audio/\*" and "video/\*"
like the "accepts" attribute on the HTML5 file input element.

If a file extension or content type matches any of those listed in allow,
it is allowed. If not, it is denied. If it matches both allow and deny,
it is denied. Typically, you would use only allow or only deny,
but not both. If you do not pass the `filter` option, all files are allowed,
as long as they pass the tests in your CollectionFS.allow() and CollectionFS.deny()
functions.

The file extensions must be specified without a leading period.

*Tip: You can do more advanced filtering in your master `beforeSave` function. If you return
`false` from a master `beforeSave` function, the file is removed. If you return
`false` from the `beforeSave` function for a copy, that copy will not be created.*

## Handlebars

To simplify your life, consider using the `cfs-handlebars` package, which provides
several helpers to easily display `FileObject` information, create file inputs,
create download or delete buttons, show file transfer progress, and more.

## FileObject Reference

TODO

## CollectionFS Reference

TODO