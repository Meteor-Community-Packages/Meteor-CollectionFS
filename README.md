# CollectionFS split into multiple packages

NOTE: This is a work-in-progress repo that will eventually be split into multiple repos/packages. Don't use it except for testing it.

## file-object

Exports FileObject, UploadRecord, and UploadsCollection objects.

An UploadsCollection is a special MongoDB collection (name = name + ".uploads")
that tracks files that have been uploaded or are currently being uploaded as well
as tracking file handling and the various copies of the URL that are available (one per filehandler).

You can start an upload by passing a FileObject to myUploadsCollection.insert() on the client or the server.
On the client, you can optionally pass a File (from a file upload element) instead, or an array of either or a FileList.

UploadsCollection has some reactive methods.

A file handling process grabs FileObjects after they've been fully uploaded into the UploadsCollection, and then
passes them to the "put" function for each defined filehandler. After all filehandler put functions have been successfully
run, the chunks (data) for the UploadRecord (a document in an UploadsCollection) are deleted. This means you don't
necessarily have to store uploaded files using GridFS. Your filehandlers could simply save to the filesystem and/or S3
and not to GridFS. But if you do want to save to GridFS, you can still do so by creating a filehandler put function
that uses .putCFS() from the collectionFS package.

Here are some examples of using various objects exported by this package:

```js
//client
var fo = new FileObject(file);
fo.metadata = {};

//client or server
var fo = new FileObject(fileRecord);

//initiate an upload
var upCol = new UploadsCollection("name");
upCol.filter();
upCol.fileHandlers(myFileHandlers);

upCol.insert(event.target.files); //first arg is FileObject or File or array of these; inserts and kicks off data uploads
```

When you define filehandlers for an UploadsCollection, you must define both a "put"
function and a "del" function. The result of the "put" function must be an object
that is saved in the UploadRecord and then passed to the "del" function as necessary
to aid in deleting that copy of the uploaded file.

You can think of "filehandlers" as "copy makers". The "put" function makes a copy of
the file and stores it somewhere. The "del" function deletes that copy.

```js
ImageUploads.fileHandlers({
  original: {
    put: function() {
      return this.putCFS(Images);
    },
    del: function(info) {
      return this.delCFS(Images, info);
    }
  },
  flippedS3: {
    put: function() {
      this.gm().flip().save();
      return this.putS3(awsOptions);
    },
    del: function(info) {
      return this.delS3(awsOptions, info);
    }
  }
});
```

The "del" function is called when you delete the UploadRecord (all copies are automatically deleted)
or when you manually call `fileObject.removeCopy("fileHandlerName")`.

## collectionFS

Exports CollectionFS and extends FileObject, adding .putCFS and .delCFS.

```js
myCFS = new CollectionFS("mycfs");
myCFS.insert(fo); //save fileInfo to .files and split buffer into .chunks collection

//or
var returnValueFromPutCFS = fo.putCFS(myCFS);
fo.delCFS(myCFS, returnValueFromPutCFS);
```

## file-object-handlebars

Adds handlebar helpers for UploadsCollections

## file-object-s3 (server only)

Adds .putS3() and .delS3() to FileObject

```js
var awsOptions = {
    endpoint: "",
    region: "",
    key: "",
    secret: "",
    bucket: "mybucket"
  };

var returnValueFromPutS3 = fo.putS3(awsOptions);

fo.delS3(awsOptions, returnValueFromPutS3);
```

## file-object-fs (server only)

Adds .putFilesystem() and .delFilesystem() to FileObject.

```js
var returnValueFromPutFilesystem = fo.putFilesystem({
  subfolder: "" //name of subfolder to use under "cfs" folder; generally might want to pass in the name of the corresponding UploadsCollection
});

fo.delFilesystem(returnValueFromPutFilesystem);
```

## file-object-gm (server only)

Adds .gm() to FileObject and adds .save() to .gm().

```js
var fo = new FileObject(fileRecord); //or FileObject.fromFile(file);
fo.gm().anyGMFunction().save();
```

Calling FileObject.gm() gets you a graphicsmagick context and then calling .save() at the end of your chain saves all of the changes back into the FileObject buffer.

The main purpose of this is to quickly and easily manipulate images within a filehandler "put" function before saving them.