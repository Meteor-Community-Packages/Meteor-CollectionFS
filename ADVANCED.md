This is advanced information useful for anyone who contributes to CollectionFS
or wants to make their own storage adapter.

## Goals

* Scale horizontally and vertically
* Secure file operations and file serving
* Limit memory consumption and stream where possible
* Use queues to provide synchronous execution of tasks
* Reactivity
* Uploads and downloads are cancelable and resumable

## All Packages

* collectionFS
* cfs-graphicsmagick
* cfs-handlebars
* cfs-filesystem
* cfs-gridfs
* cfs-s3

## Collections

Various MongoDB collections are created by CollectionFS and related packages.
Here's an explanation of what they are named and what their documents look like.

### name + ".files" (FS.Collection)

```js
{
  _id: "",
  collectionName: "",
  master: {
    _id: "", //the store ID
    name: "",
    type: "",
    size: 0,
    utime: Date
  },
  copies: {
    copyName: {
      _id: "", //the store ID
      name: "",
      type: "",
      size: 0,
      utime: Date
    }
  },
  name: "",
  type: "",
  size: 0,
  utime: Date,
  failures: {
    master: {
      count: 0,
      firstAttempt: Date,
      lastAttempt: Date
    },
    copies: {
      copyName: {
        count: 0,
        firstAttempt: Date,
        lastAttempt: Date
      }
    }
  }
}
```

### "storage." + storageAdapterType + "." + storageAdapterName + "." + storeName + ".files" (per store)

```js
{
  _id: "",
  cfs: "", //the FS.Collection name
  cfsId: "", //the _id in the CFS collection
  filename: "" //actual filename that was stored
}
```

### name + ".chunks"

Created by the GridFS storage adapter. These collections match the GridFS spec.

## Creating a Storage Adapter

To create a storage adapter, define an object constructor function that takes
a name as a first argument and any additional necessary settings as additional
arguments. Make it return an instance of FS.StorageAdapter, passing your API to
the FS.StorageAdapter constructor function. Here's an example:

```js
FS.MyStore = function(name, options) {
  // Prep some variables here

  return new FS.StorageAdapter(name, {}, {
    typeName: 'storage.myadapter',
    get: function(identifier, callback) {
      // Use identifier to retrieve a Buffer and pass it to callback
    },
    getBytes: function(identifier, start, end, callback) {
      // Use identifier to retrieve a Buffer containing only
      // the bytes from start to end, and pass it to callback.
      // If this is impossible, don't include a getBytes property.
    },
    put: function(id, fileKey, buffer, options, callback) {
      // Store the buffer and then call the callback, passing it
      // an identifier that will later be the first argument of the
      // other API functions. The identifier will likely be the
      // fileKey, the id, or some altered version of those.
    },
    remove: function(identifier, callback) {
      // Delete the data for the file identified by identifier
    },
    watch: function(callback) {
      // If you can watch file data, initialize a watcher and then call
      // callback whenever a file changes. Refer to the filesystem
      // storage adapter for an example. If you can't watch files, then
      // throw an error stating that the "sync" option is not supported.
    },
    init: function() {
      // Perform any initialization
    }
  });
};
```

`getBytes` and `init` are optional. The others are required, but you should throw
an error from `watch` if you can't watch files. Your `put` function should check
for an `overwrite` option. If it's true, save the data even if you've already
saved for the given `id` or `fileKey`. If not, you may alter the `fileKey` as
necessary to prevent overwriting and then pass the altered `fileKey` to the
callback.

By convention, any official stores should be in the `FS` namespace
and end with the word "Store".

## Architecture

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

## Transfer Queues

There are two transfer queues, one for uploads and one for downloads,
because that made some of the progress reactivity stuff easier.
They are just two separate instances of a TransferQueue, so it's a bit strange
in that TransferQueue includes code for both uploads and downloads,
but each instance only uses one or the other. There might be some less
confusing way to do that.

The TransferQueue looks at the file size on the client and automatically
decides whether to do chunked upload/download vs. a single DDP call.

* *Uploads:* For a single-call upload, it has all the data, so it immediately
passes it to the beforeSave function and storage adapters. For chunked uploads,
it will stream each chunk into a temporary file on the filesystem, keeping
track with a `bytesUploaded` property in the FS.File. After the whole file
has been saved to the temp file (`bytesUploaded === size`), it will load back
from the temp file and pass
everything to the beforeSave function and storage adapters. Using this temp
file keeps memory usage low and allows uploads to resume after the server
restarts (theoretically, I didn't test yet).
* *Downloads:* For a single-call download, it just takes the returned data
and tells the browser to save it. For chunked downloads, the data is saved
into a temporary unmanaged client collection, which is used to track progress.
When all data has been stored in the collection, it is combined and given to
the browser to save. The idea is for this to be a collection that persists if
the client reloads, such that downloads can be resumed. Currently I think the
collection is lost but maybe all we need to do is ground it with grounddb?

## The FileWorker

A single FileWorker is created on the server. It attempts to save missing data
for all CFS. Every 5 secs (not configurable right now but could be),
it looks for any file in any CFS that is fully uploaded but wasn't able to
be saved to either the master store or a copy store. It them attempts to save
to these stores again, up until the maxTries for that master/copy.

* When attempting to save to the master store at a later time, the data is loaded
from the temporary file. The temporary file is never deleted until the master
store has successfully saved. If the master store can't save after max tries,
the temp file is deleted and the FS.File is deleted from the CFS.
* When attempting to save to a copy store at a later time, the data is loaded
from the master store. If the data can't be saved to the copy store after max
tries, that copy just won't exist, but the FS.File remains in the CFS.

## PowerQueue

The PowerQueue code is really just the simple queue from the prototype.
It works well, but if it was made into more of the true PowerQueue that was
conceived, that might simplify some of the TransferQueue code.

## Wish List

* Dynamic file manipulation
* Drag/drop upload component
* Paste box upload component