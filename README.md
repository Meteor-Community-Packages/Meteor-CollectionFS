cfs-gridfs
=========================

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