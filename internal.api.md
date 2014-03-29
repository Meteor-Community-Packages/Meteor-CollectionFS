> File: ["tempStore.js"](tempStore.js)
> Where: {server}

-
##Temporary Storage

Temporary storage is used for chunked uploads until all chunks are received
and all copies have been made or given up. In some cases, the original file
is stored only in temporary storage (for example, if all copies do some
manipulation in beforeSave). This is why we use the temporary file as the
basis for each saved copy, and then remove it after all copies are saved.

Every chunk is saved as an individual temporary file. This is safer than
attempting to write multiple incoming chunks to different positions in a
single temporary file, which can lead to write conflicts.

Using temp files also allows us to easily resume uploads, even if the server
restarts, and to keep the working memory clear.
The FS.TempStore emits events that others are able to listen to

#### <a name="FS.TempStore"></a>FS.TempStore {object}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This property __TempStore__ is defined in `FS`*
*it's an event emitter*

> ```FS.TempStore = new EventEmitter();``` [tempStore.js:31](tempStore.js#L31)

-

#### <a name="{StorageAdapter}"></a>{StorageAdapter} {any}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This property is private*

This property is set to either `FS.Store.FileSystem` or `FS.Store.GridFS`

__When and why:__
We normally default to `cfs-filesystem` unless its not installed. *(we default to gridfs if installed)*
But if `cfs-gridfs` and `cfs-worker` is installed we default to `cfs-gridfs`

If `cfs-gridfs` and `cfs-filesystem` is not installed we log a warning.
the user can set `FS.TempStore.Storage` them selfs eg.:
```js
  // Its important to set `internal: true` this lets the SA know that we
  // are using this internally and it will give us direct SA api
  FS.TempStore.Storage = new FS.Store.GridFS('_tempstore', { internal: true });
```

> Note: This is considered as `advanced` use, its not a common pattern.

> ```FS.TempStore.Storage = null;``` [tempStore.js:53](tempStore.js#L53)

-

#### <a name="_chunkPath"></a>_chunkPath([n])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*

__Arguments__

* __n__ *{Number}*    (Optional)
Chunk number

-

__Returns__  *{String}*
Chunk naming convention


> ```_chunkPath = function(n) { ...``` [tempStore.js:112](tempStore.js#L112)

-

#### <a name="_fileReference"></a>_fileReference(fileObj, chunk)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
* __chunk__ *{Number}*  

-

__Returns__  *{String}*
Generated SA specific fileKey for the chunk


> ```_fileReference = function(fileObj, chunk) { ...``` [tempStore.js:123](tempStore.js#L123)

-

#### <a name="FS.TempStore.exists"></a>FS.TempStore.exists(File)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __exists__ is defined in `FS.TempStore`*

__Arguments__

* __File__ *{[FS.File](#FS.File)}*  
object

-

__TODO__
```
* This is not yet implemented, milestone 1.1.0
```


> ```FS.TempStore.exists = function(fileObj) { ...``` [tempStore.js:141](tempStore.js#L141)

-

#### <a name="FS.TempStore.listParts"></a>FS.TempStore.listParts(fileObj)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __listParts__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  

-

__Returns__  *{Object}*
of parts already stored

__TODO__
```
* This is not yet implemented, milestone 1.1.0
```


> ```FS.TempStore.listParts = function(fileObj) { ...``` [tempStore.js:157](tempStore.js#L157)

-

#### <a name="FS.TempStore.removeFile"></a>FS.TempStore.removeFile(fileObj)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __removeFile__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  

-

This function removes the file from tempstorage - it cares not if file is
already removed or not found, goal is reached anyway.

> ```FS.TempStore.removeFile = function(fileObj) { ...``` [tempStore.js:185](tempStore.js#L185)

-

#### <a name="FS.TempStore.createWriteStream"></a>FS.TempStore.createWriteStream(fileObj, [options])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __createWriteStream__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
File to store in temporary storage
* __options__ *{[Number ](#Number )|[ String](# String)}*    (Optional)

-

__Returns__  *{Stream}*
Writeable stream


`options` of different types mean differnt things:
* `undefined` We store the file in one part
*(Normal server-side api usage)*
* `Number` the number is the part number total is `fileObj.chunkSum`
*(multipart uploads will use this api)*
* `String` the string is the name of the `store` that wants to store file data
*(stores that want to sync their data to the rest of the files stores will use this)*

> Note: fileObj must be mounted on a `FS.Collection`, it makes no sense to store otherwise

> ```FS.TempStore.createWriteStream = function(fileObj, options) { ...``` [tempStore.js:221](tempStore.js#L221)

-

#### <a name="FS.TempStore.createReadStream"></a>FS.TempStore.createReadStream(fileObj)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*
*This method __createReadStream__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
The file to read

-

__Returns__  *{Stream}*
Returns readable stream


> Note: This is the true streaming object wrapped by the public api

> ```_TempstoreReadStream = function(fileObj, options) { ...``` [tempStore.js:312](tempStore.js#L312)

-

-
This is the core funciton of this read stream - we read chunk data from all
chunks

#### <a name="FS.TempStore.createReadStream"></a>FS.TempStore.createReadStream(fileObj)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __createReadStream__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
The file to read

-

__Returns__  *{Stream}*
Returns readable stream



> ```FS.TempStore.createReadStream = function(fileObj) { ...``` [tempStore.js:381](tempStore.js#L381)

-
