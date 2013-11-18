This is advanced information useful for anyone who contributes to CollectionFS
or wants to make their own storage adapter.

== Goals

* Scale horizontally and vertically
* Secure file operations and file serving
* Limit memory consumption and stream where possible
* Use queues to provide synchronous execution of tasks
* Reactivity
* Uploads and downloads are cancelable and resumable

== Collections

Various MongoDB collections are created by CollectionFS and related packages.
Here's an explanation of what they are named and what their documents look like.

=== name + ".files" (CollectionFS)

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
  utime: Date
}
```

=== "storage." + storageAdapterType + "." + storageAdapterName + "." + storeName + ".files" (per store)

```js
{
  _id: "",
  cfs: "", //the CollectionFS name
  cfsId: "", //the _id in the CFS collection
  filename: "" //actual filename that was stored
}
```

=== name + ".chunks"

Created by the GridFS storage adapter. These collections match the GridFS spec.

== Creating a Storage Adapter

To create a storage adapter, define an object constructor function that takes
a name as a first argument and any additional necessary settings as additional
arguments. Make it return an instance of StorageAdapter, passing your API to
the StorageAdapter constructor function. Here's an example:

```js
CollectionFS.MyStore = function(name, options) {
  // Prep some variables here

  return new StorageAdapter(name, {}, {
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

== Architecture

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

== Wish List

* Dynamic file manipulation
* Drag/drop upload component
* Paste box upload component