
#### <a name="FS.TempStore"></a>FS.TempStore {object}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This property __TempStore__ is defined in `FS`*
*it's an event emitter*

> ```FS.TempStore = new EventEmitter();``` [tempStore.js:33](tempStore.js#L33)

-

-
FS.TempStore.on('uploaded', function(fileObj, inOneStream) {
console.log(fileObj.name + ' is uploaded!!');
});
Stream implementation

#### <a name="FS.TempStore.removeFile"></a>FS.TempStore.removeFile(fileObj)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __removeFile__ is defined in `FS.TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  

-

This function removes the file from tempstorage - it cares not if file is
already removed or not found, goal is reached anyway.

> ```FS.TempStore.removeFile = function(fileObj) { ...``` [tempStore.js:187](tempStore.js#L187)

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

> ```FS.TempStore.createWriteStream = function(fileObj, options) { ...``` [tempStore.js:223](tempStore.js#L223)

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



> ```FS.TempStore.createReadStream = function(fileObj) { ...``` [tempStore.js:383](tempStore.js#L383)

-
