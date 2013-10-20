UploadsCollection
=========================

UploadsCollection is a smart package for Meteor that makes it trivial to upload
files from the browser or the server into a special MongoDB collection, and to
create 0 or more copies of each file after the upload is finished.

## Installation

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add uploads-collection

## Introduction

The UploadsCollection package makes available two important global variables:
`FileObject` and `UploadsCollection`.

* A `FileObject` wraps a file and it's data
on the client or server. It is similar to the browser `File` object (and can be
created from a `File` object), but it has additional properties and methods.
* An `UploadsCollection` provides a collection in which information about
uploaded files can be stored and upload progress can be tracked. It also provides
the necessary methods to upload files from the client to the server, track
upload progress reactively, pause and resume uploads, and more.

A document from an `UploadsCollection` is represented as an `UploadRecord`, another
global variable exported by this package. An `UploadRecord` is similar in some
ways to a `FileObject` but has information about all of the copies of the uploaded
file the you may choose to create. It also has a method that allows you to delete
any of those copies.

### Getting Started

The first step in using this package is to define an `UploadsCollection`.

```js
ImageUploads = new UploadsCollection("images");
ImageUploads.filter({
  allow: {
    contentTypes: ['image/*']
  }
});
```

In this example, we've defined an UploadsCollection named "images", which will
be a new collection in your MongoDB database with the name "images.uploads". We've
also defined a filter for it, stating that only images can be uploaded to it.

Your UploadsCollection variable does not necessarily have to be global on the
client or the server, but be sure to give it the same name on both the client and
the server.

Now we can upload a file from the client. Here is an example of doing so from
the change event handler of an HTML file input:

```js
Template.myForm.events({
  'change .myFileInput': function(event, template) {
    var file = event.target.files[0];
    if (file) {
      ImageUploads.insert(file);
    }
  }
});
```

Notice that the only thing we're doing is passing the browser-provided `File`
object to `ImageUploads.insert()`. This will save the file's properties into
an `UploadRecord` in the `ImageUploads` UploadsCollection, and then immediately
begin uploading the data to the server with reactive progress updates.

On the client, the `insert` method can alternatively accept these other types of objects
as it's first argument:

* A `FileObject`
* A `FileList`
* An array of `FileObject` or `File` objects

On the server, the first argument of `insert` must be a single `FileObject` with
its buffer set.

### After the Upload

By default,
the actual file is not saved anywhere after upload; only the file details are
saved in the UploadsCollection record. To manipulate and save the file, you
define one or more "file handlers", which tell the UploadsCollection how to
manipulate, save, and delete a single copy of the file. By defining more than
one file handler, you can save variations of a file or save it in multiple
places.

While you could write all of the manipulating, saving, and deleting code
in the file handler functions yourself, there are several companion packages
that can do all of the work for you:

* `fileobject-gm`: Allows you to call any number of graphicsmagick methods on a copy of an uploaded file, updating the file's associated buffer with the results of the transformations.
* `collectionFS`: Allows you to save a copy of an uploaded file into two `Meteor.Collection`s that follow the GridFS spec.
* `fileobject-storage-filesystem`: Allows you to save a copy of an uploaded file to the server filesystem.
* `fileobject-storage-s3`: Allows you to save a copy of an uploaded file to an Amazon S3 bucket.

Returning to our `ImageUploads` example, let's say we now want to define three
file handlers in order to save three different copies of each uploaded file. We
first want to save the original uploaded image to an S3 bucket. Then we want to
save a smaller copy of the image to our server filesystem. Finally, we want to
save an even smaller, blurry thumbnail image into a CollectionFS. Our file handlers
would look something like this:


```js
Thumbnails = new CollectionFS("thumbnails");

ImageUploads.fileHandlers({
  original: {
    put: function() {
      return this.putS3(awsConfig);
    },
    del: function(info) {
      return this.delS3(awsConfig, info);
    }
  },
  smaller: {
    put: function() {
      this.gm().resize(400, 400).save();
      return this.putFilesystem({
        subfolder: "smaller"
      });
    },
    del: function(info) {
      return this.delFilesystem(info);
    }
  },
  thumbnail: {
    put: function() {
      this.gm().resize(60, 60).blur(7, 3).save();
      return this.putCFS(Thumbnails);
    },
    del: function(info) {
      return this.delCFS(Thumbnails, info);
    }
  }
});
```

In a "put" or "del" file handler function, `this` will be the uploaded `FileObject`.
The "put__" and "del__" methods used in this example are methods added by the
aforementioned companion packages. See those READMEs for documentation.

In this case, the "put__" and "del__" methods provided by the companion packages
return the correct return values for us, but if you were to do something custom
in your file handler methods (or create your own companion package!), you should
follow these guidelines:

* The "put" function should save the file somewhere and return an object that contains any properties necessary to be able to retrieve or delete it.
* The object returned by the "put" function should have a "url" property by convention. If there is no associated URL, set it to `null`.
* If the "put" function fails to save the file for potentially temporary reasons, return `false` and it will be retried later.
* If the "put" function fails to save the file permanently or chooses not to save it, return `null` and it will not be retried later.
* The "del" function receives the "put" function's return value as its only argument. (It will always be an object. The "del" function is never called if the "put" function returns `null` or `false`.) Use this information to delete the file. Return `true` if it's deleted or `false` if it can't be deleted.

It may be helpful to think of file handlers as "copy makers". The "put" function
makes a copy of the file and stores it somewhere. The "del" function deletes that
copy.

The "del" function is called when you delete the UploadRecord (all copies are automatically deleted)
or when you manually call `fileObject.removeCopy("fileHandlerName")`.