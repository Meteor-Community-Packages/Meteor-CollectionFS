# Changelog

## vCurrent
## [v0.5.2] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.5.2)
#### 17/12/14 by Morten Henriksen
## [v0.5.1] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.5.1)
#### 17/12/14 by Morten Henriksen
- Bump to version 0.5.1

- mbr update, remove versions.json

## [v0.5.0] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.5.0)
#### 17/12/14 by Morten Henriksen
- mbr update versions and fix warnings

- add back tests and emit removed event

- 0.9.1 support

## [v0.4.13] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.13)
#### 29/08/14 by Morten Henriksen
- Meteor Package System Update

## [v0.4.12] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.12)
#### 27/08/14 by Eric Dobbertin
- change package name to lowercase

## [v0.4.11] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.11)
#### 31/07/14 by Eric Dobbertin
- fix collection event emission and emit on fileObj, too

- add some tests

## [v0.4.10] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.10)
#### 27/05/14 by Eric Dobbertin
- FS.Collection emit 'stored' and 'uploaded' and 'error' events on server

## [v0.4.9] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.9)
#### 29/04/14 by Eric Dobbertin
- remove empty files

## [v0.4.8] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.8)
#### 09/04/14 by Eric Dobbertin
- move filter code to new cfs-collection-filters pkg

- TempStore uses a tracking collection now, so setting chunk info here isn't necessary

## [v0.4.7] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.7)
#### 07/04/14 by Eric Dobbertin
- set chunk info on the server

## [v0.4.6] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.6)
#### 07/04/14 by Eric Dobbertin
- move chunk info handling to cfs-upload-http package

## [v0.4.5] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.5)
#### 31/03/14 by Eric Dobbertin
- use latest releases

## [v0.4.4] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.4)
#### 30/03/14 by Morten Henriksen
- Out factor passOrThrow into base utility

- Remove underscore deps

## [v0.4.3] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.3)
#### 25/03/14 by Morten Henriksen
- Add todo refactoring notes

## [v0.4.2] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.2)
#### 23/03/14 by Morten Henriksen
- Rollback to specific git dependency

- use collectionFS travis version force update

## [v0.4.1] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.1)
#### 22/03/14 by Morten Henriksen
- try to fix travis test by using general package references

## [v0.4.0] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.4.0)
#### 19/03/14 by Morten Henriksen
## [v0.0.12] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.12)
#### 18/03/14 by Morten Henriksen
- use synchronous attachData when passed a URL and there is no callback on the server

- Fix upload bug - Upload is working again

- add file for server specific code

- fix some issues with inserting URLs, improve logic a bit, and move allowed checks into here (makes more sense)

- make server-side inserts of any data work again

- allow 2 mb uploads

- Setting this a bit lower for now

- use chunks in file record

- change default chunk size to 2MB

- Add streaming WIP

## [v0.0.11] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.11)
#### 07/03/14 by Eric Dobbertin
- Merge branch 'master' of https://github.com/CollectionFS/Meteor-cfs-collection

- fix prefix so that it works in mongo shell

- Use correct logic for when calling insert without a callback on the server; add support for inserting a URL string, which is then downloaded into a FS.File (done on the server when invoked client-side)

- deprecate use of the join package - bad pattern

## [v0.0.10] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.10)
#### 05/03/14 by Morten Henriksen
- changed to the prefix `_cfs.` instead as a general namespace

## [v0.0.9] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.9)
#### 05/03/14 by Morten Henriksen
- *Fixed bug:* "Should not use gridFS .files suffix on collection" [#2](https://github.com/CollectionFS/Meteor-cfs-collection/issues/2)

- remove console log

## [v0.0.8] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.8)
#### 02/03/14 by Eric Dobbertin
- remove sync stuff since it's unused for now

- remove saveCopy and move to cfs-worker pkg

- remove console.log

- Merge branch 'master' of https://github.com/CollectionFS/Meteor-cfs-collection

## [v0.0.7] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.7)
#### 28/02/14 by Eric Dobbertin
- changes for http uploads

- fix issues with callbacks

## [v0.0.6] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.6)
#### 17/02/14 by Morten Henriksen
- remove http-methods dependency

## [v0.0.5] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.5)
#### 16/02/14 by Morten Henriksen
- cache correct name

- remove automounthttp option; use generic url now

## [v0.0.4] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.4)
#### 15/02/14 by Morten Henriksen
- decrease default upload chunk size to eliminate UI blocking

- fix errors when no options passed

- rework http/ddp method init; also DDP methods don't need to be per-collection so they no longer are

- remove autopublish check for endpoints

## [v0.0.3] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.3)
#### 13/02/14 by Morten Henriksen
- Added http-methods dependency and refactored code a bit

## [v0.0.2] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.2)
#### 13/02/14 by Morten Henriksen
## [v0.0.1] (https://github.com/CollectionFS/Meteor-cfs-collection/tree/v0.0.1)
#### 13/02/14 by Morten Henriksen
- init commit

