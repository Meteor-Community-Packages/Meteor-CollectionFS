CollectionFS
=========================

CollectionFS is a smart package for Meteor that makes it trivial to upload
files from the browser or the server into a special MongoDB collection, and to
create 0 or more copies of each file after the upload is finished.

## Installation

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add collectionFS
```

## Introduction

The CollectionFS package makes available two important global variables:
`FileObject` and `CollectionFS`.

* A `FileObject` wraps a file and it's data
on the client or server. It is similar to the browser `File` object (and can be
created from a `File` object), but it has additional properties and methods.
* An `CollectionFS` provides a collection in which information about
uploaded files can be stored. It also provides
the necessary methods to upload and download the files, track
upload and download progress reactively, pause and resume uploads, and more.

A document from an `CollectionFS` is represented as an `UploadRecord`, another
global variable exported by this package. An `UploadRecord` is similar in some
ways to a `FileObject` but has information about all of the copies of the uploaded
file the you may choose to create. It also has methods that allow you to download or delete
any of those copies by name.

### Getting Started

The first step in using this package is to define an `CollectionFS`.

```js
ImageUploads = new CollectionFS("images");
ImageUploads.filter({
  allow: {
    contentTypes: ['image/*']
  }
});
```

In this example, we've defined an CollectionFS named "images", which will
be a new collection in your MongoDB database with the name "images.uploads". We've
also defined a filter for it, stating that only images can be uploaded to it.

Your CollectionFS variable does not necessarily have to be global on the
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
an `UploadRecord` in the `ImageUploads` CollectionFS, and then immediately
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
saved in the CollectionFS record. To manipulate and save the file, you
use a `copies` method to define one or more copies of the file, which tell the CollectionFS how to
manipulate, save, retrieve, and delete a single copy of the file. By defining more than
one copy, you can save variations of a file or save it in multiple
places.

As part of defining a copy, you must indicate which storage adaptor should be used:

* `fileobject-gm`: Allows you to call any number of graphicsmagick methods on a copy of an uploaded file within a `beforeSave` method, updating the file's associated buffer with the results of the transformations.
* `fileobject-storage-gridfs`: Adds "gridFS" adaptor. Allows you to save a copy of an uploaded file into two `Meteor.Collection`s that follow the GridFS spec.
* `fileobject-storage-filesystem`: Adds "filesystem" adaptor. Allows you to save a copy of an uploaded file to the server filesystem.
* `fileobject-storage-s3`: Adds "s3" adaptor. Allows you to save a copy of an uploaded file to an Amazon S3 bucket.

Returning to our `ImageUploads` example, let's say we now want to save three
different copies of each uploaded file. We
first want to save the original uploaded image to an S3 bucket. Then we want to
save a smaller copy of the image to our server filesystem. Finally, we want to
save an even smaller, blurry thumbnail image into a GridFS collection in our
MongoDB database. Our `copies` method call would look something like this:

```js
if (Meteor.isServer) {
  Meteor.startup(function () {
    ImageUploads.copies({
      original: {
        saveTo: "s3",
        config: awsOptions
      },
      smaller: {
        saveTo: "filesystem",
        config: {
          subfolder: "smaller"
        },
        beforeSave: function() {
          this.gm().resize(400, 400).save();
        }
      },
      thumbnail: {
        saveTo: "gridFS",
        beforeSave: function () {
          this.gm().resize(60, 60).blur(7, 3).save();
        }
      }
    });
  });
}
```

Note that:

* `saveTo` is the name of the storage adaptor to use.
* `config` is for any information the storage adaptor needs. See those READMEs for documentation.
* `beforeSave` is a method that will be called with the FileObject as its context prior to saving that copy of the file. You can manipulate the file or return false to prevent the copy from being created. If you change the file to a different type, make sure that the `filename` and `contentType` and `length` properties of the FileObject are updated if necessary.