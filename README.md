CollectionFS
=========================

NOTE: This branch is under active development right now (2013-11-20). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

CollectionFS is a smart package for Meteor that provides a complete file
management solution including uploading, downloading, storage, synchronization,
manipulation, and copying. It supports several storage adapters for saving to
the local filesystem, GridFS, or S3, and additional storage adapters can be
created.

## Installation

### Current Instructions

Right now this branch should be used for testing or experimentation only.
As such, you cannot yet use `mrt add` to install.

Assuming you've created a new Meteor app or have an existing one, first
manually edit the `smart.json` file for the app. Create it if necessary.
It should look something like this.

```js
{
  "packages": {
    "collectionFS": {
      "git": "https://github.com/CollectionFS/Meteor-CollectionFS.git",
      "branch": "devel-merge"
    },
    "cfs-gridfs": {
      "git": "https://github.com/CollectionFS/Meteor-cfs-gridfs.git",
      "branch": "master"
    },
    "cfs-filesystem": {
      "git": "https://github.com/CollectionFS/Meteor-cfs-filesystem.git",
      "branch": "master"
    },
    "cfs-handlebars": {
      "git": "https://github.com/CollectionFS/Meteor-cfs-handlebars.git",
      "branch": "master"
    },
    "cfs-graphicsmagick": {
      "git": "https://github.com/CollectionFS/Meteor-cfs-graphicsmagick.git",
      "branch": "master"
    }
  }
}
```

'collectionFS' is the main package. Beyond that, you only need to add the
packages you want to use. See the Storage Adapters
section for a list of the available storage adapter packages. Most people
will probably want `cfs-handlebars`. If you're dealing with image files,
you'll probably want `cfs-graphicsmagick`. Note that you'll have to also install
GraphicsMagick and/or ImageMagick on the server or development machine. See
the README for the `cfs-graphicsmagick` package. All the packages have their
own README files you should read.

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

### Eventual Instructions

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add collectionFS
```

You may need to add additional packages depending on how you are using
CollectionFS. Continue reading for details.

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

*client.js:*

```js
var Images = new FS.Collection("images");
```

*server.js:*

```js
var Images = new FS.Collection("images", {
  useHTTP: true,
  store: new FS.FileSystemStore("images", "~/uploads")
});
```

In this example, we've defined a FS.Collection named "images", which will
be a new collection in your MongoDB database with the name "images.files". We've
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

To configure the maximum number of save attempts, use the `maxTries` option. You
can specify a general value or separate values for any specific copies. The
default is 5.

## Storage Adapters

There are currently three available storage adapters, which are in separate
packages. Refer to the package documentation for usage instructions.

* [cfs-gridfs](https://github.com/CollectionFS/Meteor-cfs-gridfs): Allows you to save data chunks into `Meteor.Collection`s that follow the GridFS spec.
* [cfs-filesystem](https://github.com/CollectionFS/Meteor-cfs-filesystem): Allows you to save to the server filesystem.
* [cfs-s3](https://github.com/CollectionFS/Meteor-cfs-s3): Allows you to save to an Amazon S3 bucket.

Storage adapters also handle retrieving the file data and removing the file data
when you delete the file. Some of them support synchronization, where updates
to the store are automatically synchronized with the linked FS.Collection.

## File Manipulation

You may want to manipulate files before saving them. For example, if a user
uploads a large image, you may want to reduce its resolution, crop it,
compress it, etc. before allowing the storage adapter to save it. You may also
want to convert to another content type or change the filename. You can do all
of this by defining a `beforeSave` method.

A `beforeSave` method can be defined for any copy. It does not receive any
arguments, but its context is the
`FS.File` being saved, which you can alter as necessary.

The most common scenario is image manipulation, and for this there is a
convenient package,
[cfs-graphicsmagick](https://github.com/CollectionFS/Meteor-cfs-graphicsmagick),
that allows you to easily call `GraphicsMagick` methods on the `FS.File`
data. Here's an example:

```js
Images = new FS.Collection("images", {
  store: new FS.FileSystemStore("images", "~/uploads"),
  beforeSave: function () {
    this.gm().resize(60, 60).blur(7, 3).save();
  }
});
```

It's pretty easy to understand. First call `gm()` on the `FS.File` to enter
a special GraphicsMagick context, then call any methods from the node `gm` package,
and finally call `save()` to update the `FS.File` data with those modifications.
Refer to the
[cfs-graphicsmagick](https://github.com/CollectionFS/Meteor-cfs-graphicsmagick)
package documentation for more information.

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
as long as they pass the tests in your FS.Collection.allow() and
FS.Collection.deny() functions.

The file extensions must be specified without a leading period.

*Tip: You can do more advanced filtering in your `beforeSave` function.
If you return `false` from the `beforeSave` function for a copy,
that copy will never be created.*

## Handlebars

To simplify your life, consider using the
[cfs-handlebars](https://github.com/CollectionFS/Meteor-cfs-handlebars)
package, which provides
several helpers to easily display `FS.File` information, create file inputs,
create download or delete buttons, show file transfer progress, and more.

## FS.File Reference

TODO

## FS.Collection Reference

TODO
