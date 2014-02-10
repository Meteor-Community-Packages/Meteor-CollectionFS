cfs-filesystem
=========================

NOTE: This branch is under active development right now (2014-2-10). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

A Meteor package that adds local server filesystem storage for
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS). When you
use this storage adapter, file data is stored in a directory of your choosing
on the same server on which your Meteor app is running.

## Installation

NOTE: Until this is added to atmosphere, use this in smart.json:

```js
"cfs-filesystem": {
  "git": "https://github.com/CollectionFS/Meteor-cfs-filesystem.git",
  "branch": "master"
}
```

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add cfs-filesystem
```

## Usage

```js
var imageStore = new FS.Store.FileSystem("images", {
  dir: "~/app-files/images", //optional, default '~/cfs/files/name'
  beforeSave: myBeforeSaveFunction, //optional
  maxTries: 1 //optional, default 5
});

Images = new FS.Collection("images", {
  stores: [imageStore]
});
```

## Notes

A FileSystem store theoretically supports the `sync` option, but this feature
is not yet working correctly.