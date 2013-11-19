cfs-gridfs
=========================

NOTE: This branch is under active development right now (2013-11-18). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

A Meteor package that adds GridFS-like storage for
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS). When you
use this storage adapter, file data is stored in chunks in a `Meteor.Collection`
in your MongoDB database.

## Installation

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add cfs-gridfs
```

## Usage

```js
Images = new CollectionFS("images", {
  store: new CollectionFS.GridFSStore("images")
});
```

## Notes

A GridFSStore does not support the `sync` option.