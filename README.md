cfs-gridfs
=========================

NOTE: This branch is under active development right now (2014-2-10). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

A Meteor package that adds GridFS-like storage for
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS). When you
use this storage adapter, file data is stored in chunks in a `Meteor.Collection`
in your MongoDB database.

## Installation

NOTE: Until this is added to atmosphere, use this in smart.json:

```js
"cfs-gridfs": {
  "git": "https://github.com/CollectionFS/Meteor-cfs-gridfs.git",
  "branch": "master"
}
```

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add cfs-gridfs
```

## Usage

```js
var imageStore = new FS.Store.GridFS("images", {
  beforeSave: myBeforeSaveFunction, //optional
  maxTries: 1 //optional, default 5
});

Images = new FS.Collection("images", {
  stores: [imageStore]
});
```

## Notes

A GridFS store does not currently support the `sync` option.