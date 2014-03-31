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

#### <a name="FS.TempStore.removeFile"></a>FS.TempStore.removeFile(fileObj)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __removeFile__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  

-

This function removes the file from tempstorage - it cares not if file is
already removed or not found, goal is reached anyway.

> ```FS.TempStore.removeFile = function(fileObj) { ...``` [tempStore.js:186](tempStore.js#L186)

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

> ```FS.TempStore.createWriteStream = function(fileObj, options) { ...``` [tempStore.js:222](tempStore.js#L222)

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



> ```FS.TempStore.createReadStream = function(fileObj) { ...``` [tempStore.js:382](tempStore.js#L382)

-
