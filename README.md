cfs-filesystem
=========================

NOTE: This branch is under active development right now (2013-11-18). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

A Meteor package that adds local server filesystem storage for
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS). When you
use this storage adapter, file data is stored in a directory of your choosing
on the same server on which your Meteor app is running.

## Installation

Install using Meteorite. When in a Meteorite-managed app directory, enter:

```
$ mrt add cfs-filesystem
```

## Usage

```js
Images = new CollectionFS("images", {
  store: new CollectionFS.FileSystemStore("images", "~/app-files/images")
});
```

## Notes

A FileSystemStore theoretically supports the `sync` option, but this feature
is not yet working correctly. When you use a FileSystemStore as the master
store for a CollectionFS with the `sync` option set to `true`, file changes
caused by something other than your app in the designated directory will
be synchronized back to your CollectionFS.