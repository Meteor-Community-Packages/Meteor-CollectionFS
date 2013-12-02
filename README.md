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
Images = new FS.Collection("images", {
  store: new FS.FileSystemStore("images", "~/app-files/images")
});
```

## Notes

A FileSystemStore theoretically supports the `sync` option, but this feature
is not yet working correctly. When you use a FileSystemStore as the master
store for a FS.Collection with the `sync` option set to `true`, file changes
caused by something other than your app in the designated directory will
be synchronized back to your FS.Collection.