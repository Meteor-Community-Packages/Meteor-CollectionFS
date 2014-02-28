> File: ["fsFile-common.js"](fsFile-common.js)
> Where: {client|server}

-

#### <a name="FS.File"></a>new FS.File(ref)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __File__ is defined in `FS`*

__Arguments__

* __ref__ *{object|[File](#File)|[Blob](#Blob)}*  
File reference

-

__TODO__
```
* Should we refactor the file record into `self.record`?
```


> ```FS.File = function(ref, createdByTransform) { ...``` [fsFile-common.js:9](fsFile-common.js#L9)

-

#### <a name="FS.File.prototype._attachFile"></a>*fsFile*._attachFile(ref)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*
*This method ___attachFile__ is defined in `prototype` of `FS.File`*

__Arguments__

* __ref__ *{[File](#File)|[Blob](#Blob)}*  
File or Blob instance to attach

-

> ```self._attachFile = function(ref) { ...``` [fsFile-common.js:24](fsFile-common.js#L24)

-

#### <a name="FS.File.prototype.uploadProgress"></a>*fsFile*.uploadProgress()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __uploadProgress__ is defined in `prototype` of `FS.File`*

__Returns__  *{number}*
The server confirmed upload progress


> ```FS.File.prototype.uploadProgress = function() { ...``` [fsFile-common.js:43](fsFile-common.js#L43)

-

#### <a name="FS.File.prototype.controlledByDeps"></a>*fsFile*.controlledByDeps()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __controlledByDeps__ is defined in `prototype` of `FS.File`*

__Returns__  *{FS.Collection}*
Returns true if this FS.File is reactive


> Note: Returns true if this FS.File object was created by a FS.Collection
> and we are in a reactive computations. What does this mean? Well it should
> mean that our fileRecord is fully updated by Meteor and we are mounted on
> a collection

> ```FS.File.prototype.controlledByDeps = function() { ...``` [fsFile-common.js:66](fsFile-common.js#L66)

-

#### <a name="FS.File.prototype.getCollection"></a>*fsFile*.getCollection()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getCollection__ is defined in `prototype` of `FS.File`*

__Returns__  *{FS.Collection}*
Returns attached collection or undefined if not mounted


> ```FS.File.prototype.getCollection = function() { ...``` [fsFile-common.js:76](fsFile-common.js#L76)

-

#### <a name="FS.File.prototype.isMounted"></a>*fsFile*.isMounted()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isMounted__ is defined in `prototype` of `FS.File`*

__Returns__  *{FS.Collection}*
Returns attached collection or undefined if not mounted


> Note: This will throw an error if collection not found and file is mounted
> *(got an invalid collectionName)*

> ```FS.File.prototype.isMounted = FS.File.prototype.getCollection;``` [fsFile-common.js:107](fsFile-common.js#L107)

-

#### <a name="FS.File.prototype.getFileRecord"></a>*fsFile*.getFileRecord()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getFileRecord__ is defined in `prototype` of `FS.File`*

__Returns__  *{object}*
The filerecord


> ```FS.File.prototype.getFileRecord = function() { ...``` [fsFile-common.js:114](fsFile-common.js#L114)

-

#### <a name="FS.File.prototype.update"></a>*fsFile*.update(modifier, [options], [callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __update__ is defined in `prototype` of `FS.File`*

__Arguments__

* __modifier__ *{[modifier](#modifier)}*  
* __options__ *{object}*    (Optional)
* __callback__ *{function}*    (Optional)

-


Updates the fileRecord.

> ```FS.File.prototype.update = function(modifier, options, callback) { ...``` [fsFile-common.js:145](fsFile-common.js#L145)

-

#### <a name="FS.File.prototype.remove"></a>*fsFile*.remove([callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Remove the current file from its FS.Collection
```
-
*This method __remove__ is defined in `prototype` of `FS.File`*

__Arguments__

* __callback__ *{Function}*    (Optional)

-

__Returns__  *{number}*
Count



> ```FS.File.prototype.remove = function(callback) { ...``` [fsFile-common.js:176](fsFile-common.js#L176)

-

#### <a name="FS.File.prototype.moveTo"></a>*fsFile*.moveTo(targetCollection)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*
*This method __moveTo__ is defined in `prototype` of `FS.File`*

__Arguments__

* __targetCollection__ *{[FS.Collection](#FS.Collection)}*  

-

__TODO__
```
* Needs to be implemented
```


Move the file from current collection to another collection

> Note: Not yet implemented

> ```FS.File.prototype.get = function(options) { ...``` [fsFile-common.js:226](fsFile-common.js#L226)

-

#### <a name="FS.File.prototype.get"></a>*fsFile*.get([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __get__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __storeName__ *{string}*    (Optional)
Name of the store to get from. If not defined
    - __start__ *{number}*    (Optional)
    - __end__ *{number}*    (Optional)

-

__Returns__  *{number}*
Count

on the client, the first store saved into `fsFile.copies` is used. If not
defined on the server, the first store defined in `options.stores` for the
collection is used. So if there is only one store, you can generally omit
this, but if there are multiple, it's best to specify.

Client: Instructs the DownloadTransferQueue to begin downloading the file copy
Server: Returns the Buffer data for the copy

> ```FS.File.prototype.get = function(options) { ...``` [fsFile-common.js:226](fsFile-common.js#L226)

-

#### <a name="FS.File.prototype.url"></a>*fsFile*.url([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __url__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __store__ *{string}*    (Optional)
Name of the store to get from. If not defined,
    - __auth__ *{boolean}*    (Default = null)
Wether or not the authenticate
    - __download__ *{boolean}*    (Default = false)
Should headers be set to force a download
    - __brokenIsFine__ *{boolean}*    (Default = false)
Return the URL even if

-

the first store defined in `options.stores` for the collection is used.
we know it's currently a broken link because the file hasn't been saved in
the requested store yet.

Return the http url for getting the file - on server set auth if wanting to
use authentication on client set auth to true or token

> ```FS.File.prototype.url = function(options) { ...``` [fsFile-common.js:250](fsFile-common.js#L250)

-

#### <a name="FS.File.prototype.downloadUrl"></a>*fsFile*.downloadUrl([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
> __Warning!__
> This method "FS.File.prototype.downloadUrl" has deprecated from the api
> Use The hybrid helper `FS.File.url`

*This method __downloadUrl__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __store__ *{string}*    (Optional)
Name of the store to get from. If not defined,
    - __auth__ *{boolean}*    (Default = null)
Wether or not the authenticate

-

the first store defined in `options.stores` for the collection is used.

> ```FS.File.prototype.downloadUrl = function(options) { ...``` [fsFile-common.js:331](fsFile-common.js#L331)

-

#### <a name="FS.File.prototype.put"></a>*fsFile*.put([callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __put__ is defined in `prototype` of `FS.File`*

__Arguments__

* __callback__ *{function}*    (Optional)
Callback for returning errors and updated FS.File

-


```
fo.put(function(err, fo) {
if (err) {
console.log('Got an error');
} else {
console.log('Passed on the file: ' + fo);
}
});
```

> ```FS.File.prototype.put = function(callback) { ...``` [fsFile-common.js:353](fsFile-common.js#L353)

-

#### <a name="FS.File.prototype.resume"></a>*fsFile*.resume(ref)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __resume__ is defined in `prototype` of `FS.File`*

__Arguments__

* __ref__ *{[File](#File)|[Blob](#Blob)|Buffer}*  

-

__TODO__
```
* WIP, Not yet implemented for server
```


> This function is not yet implemented for server

> ```FS.File.prototype.resume = function(ref) { ...``` [fsFile-common.js:391](fsFile-common.js#L391)

-

#### <a name="FS.File.prototype.getExtension"></a>*fsFile*.getExtension()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getExtension__ is defined in `prototype` of `FS.File`*

__Returns__  *{string}*
The extension eg.: `jpg` or if not found then an empty string ''


> ```FS.File.prototype.getExtension = function() { ...``` [fsFile-common.js:404](fsFile-common.js#L404)

-

#### <a name="FS.File.prototype.toDataUrl"></a>*fsFile*.toDataUrl(callback)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __toDataUrl__ is defined in `prototype` of `FS.File`*

__Arguments__

* __callback__ *{function}*  
Callback(err, dataUrl) (callback is optional on server)

-

__TODO__
```
* Split client and server code
```


> ```FS.File.prototype.toDataUrl = function(callback) { ...``` [fsFile-common.js:422](fsFile-common.js#L422)

-

#### <a name="FS.File.prototype.isImage"></a>*fsFile*.isImage([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isImage__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __store__ *{string}*    (Optional)
The store we're interested in

-


Returns true if the copy of this file in the specified store has an image
content type. If the file object is unmounted or doesn't have a copy for
the specified store, or if you don't specify a store, this method checks
the content type of the original file.

> ```FS.File.prototype.isImage = function(options) { ...``` [fsFile-common.js:492](fsFile-common.js#L492)

-

#### <a name="FS.File.prototype.isVideo"></a>*fsFile*.isVideo([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isVideo__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __store__ *{string}*    (Optional)
The store we're interested in

-


Returns true if the copy of this file in the specified store has a video
content type. If the file object is unmounted or doesn't have a copy for
the specified store, or if you don't specify a store, this method checks
the content type of the original file.

> ```FS.File.prototype.isVideo = function(options) { ...``` [fsFile-common.js:507](fsFile-common.js#L507)

-

#### <a name="FS.File.prototype.isAudio"></a>*fsFile*.isAudio([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isAudio__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __store__ *{string}*    (Optional)
The store we're interested in

-


Returns true if the copy of this file in the specified store has an audio
content type. If the file object is unmounted or doesn't have a copy for
the specified store, or if you don't specify a store, this method checks
the content type of the original file.

> ```FS.File.prototype.isAudio = function(options) { ...``` [fsFile-common.js:522](fsFile-common.js#L522)

-

#### <a name="FS.File.prototype.isUploaded"></a>*fsFile*.isUploaded()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isUploaded__ is defined in `prototype` of `FS.File`*

__Returns__  *{boolean}*
True if the number of uploaded bytes is equal to the file size.


> ```FS.File.prototype.isUploaded = function() { ...``` [fsFile-common.js:531](fsFile-common.js#L531)

-

#### <a name="FS.File.prototype.chunkIsUploaded"></a>*fsFile*.chunkIsUploaded(start)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __chunkIsUploaded__ is defined in `prototype` of `FS.File`*

__Arguments__

* __start__ *{number}*  

-

__Returns__  *{boolean}*
True if the chunk starting at start has already been uploaded successfully.


> ```FS.File.prototype.chunkIsUploaded = function(start) { ...``` [fsFile-common.js:546](fsFile-common.js#L546)

-

#### <a name="FS.File.prototype.hasCopy"></a>*fsFile*.hasCopy(storeName, [optimistic])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __hasCopy__ is defined in `prototype` of `FS.File`*

__Arguments__

* __storeName__ *{string}*  
Name of the store to check for a copy of this file
* __optimistic__ *{boolean}*    (Optional = false)
In case that the file record is not found, read below

-

__Returns__  *{boolean}*
If the copy exists or not


> Note: If the file is not published to the client or simply not found:
this method cannot know for sure if it exists or not. The `optimistic`
param is the boolean value to return. Are we `optimistic` that the copy
could exist. This is the case in `FS.File.url` we are optimistic that the
copy supplied by the user exists.

> ```FS.File.prototype.hasCopy = function(storeName, optimistic) { ...``` [fsFile-common.js:568](fsFile-common.js#L568)

-

#### <a name="FS.File.prototype.getCopyInfo"></a>*fsFile*.getCopyInfo(storeName)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getCopyInfo__ is defined in `prototype` of `FS.File`*

__Arguments__

* __storeName__ *{string}*  
Name of the store for which to get copy info.

-

__Returns__  *{Object}*
The file details, e.g., name, size, key, etc., specific to the copy saved in this store.


> ```FS.File.prototype.getCopyInfo = function(storeName) { ...``` [fsFile-common.js:588](fsFile-common.js#L588)

-

#### <a name="FS.File.prototype.hasMaster"></a>*fsFile*.hasMaster()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __hasMaster__ is defined in `prototype` of `FS.File`*

__Returns__  *{boolean}*
True if the attached collection allows this file.


Checks based on any filters defined on the attached collection. If the
file is not valid according to the filters, this method returns false
and also calls the filter `onInvalid` method defined for the attached
collection, passing it an English error string that explains why it
failed.


> ```FS.File.prototype.fileIsAllowed = function() { ...``` [fsFile-common.js:607](fsFile-common.js#L607)

-

#### <a name="contentTypeInList"></a>contentTypeInList(list, contentType)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*

__Arguments__

* __list__ *{[String[]](#String[])}*  
 Array of content types
* __contentType__ *{String}*  
 The content type

-

__Returns__  *{Boolean}*


Returns true if the content type is in the list, or if it matches
one of the special types in the list, e.g., "image/*".

> ```var contentTypeInList = function contentTypeInList(list, contentType) { ...``` [fsFile-common.js:666](fsFile-common.js#L666)

-


---
> File: ["fsFile-data-get.js"](fsFile-data-get.js)
> Where: {client|server}

-

#### <a name="FS.File.prototype.hasData"></a>*fsFile*.hasData()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Client/Server. Returns true if the FS.File has binary data or a file attached.
```
-
*This method __hasData__ is defined in `prototype` of `FS.File`*

__Returns__  *{Boolean}*




> ```FS.File.prototype.hasData = function() { ...``` [fsFile-data-get.js:11](fsFile-data-get.js#L11)

-

#### <a name="FS.File.prototype.dataSize"></a>*fsFile*.dataSize()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Client/Server. Returns the size/length of the attached file data.
```
-
*This method __dataSize__ is defined in `prototype` of `FS.File`*

__Returns__  *{Number}*



> ```FS.File.prototype.dataSize = function() { ...``` [fsFile-data-get.js:21](fsFile-data-get.js#L21)

-

#### <a name="FS.File.prototype.getBinary"></a>*fsFile*.getBinary(start, end, callback)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Client/Server. Passes Uint8Array for the requested data to a callback. On
the server, blocks and returns the data if there is no callback.
```
-
*This method __getBinary__ is defined in `prototype` of `FS.File`*

__Arguments__

* __start__ *{Number}*  
 First byte position to read.
* __end__ *{Number}*  
 Last byte position to read.
* __callback__ *{Function}*  
 Required on the client; optional on the server.

-

__Returns__  *{Uint8Array|undefined}*



> ```FS.File.prototype.getBinary = function(start, end, callback) { ...``` [fsFile-data-get.js:40](fsFile-data-get.js#L40)

-

#### <a name="FS.File.prototype.getBlob"></a>*fsFile*.getBlob()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Returns a Blob object representing the file's data, or undefined if there
is no attached data.
```
-
*This method __getBlob__ is defined in `prototype` of `FS.File`*

__Returns__  *{Blob}*


> ```FS.File.prototype.getBlob = function() { ...``` [fsFile-data-get.js:116](fsFile-data-get.js#L116)

-

#### <a name="FS.File.prototype.getBuffer"></a>*fsFile*.getBuffer()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Returns a Buffer object representing the file's data, or undefined if there
is no attached data.
```
-
*This method __getBuffer__ is defined in `prototype` of `FS.File`*

__Returns__  *{Buffer}*


> ```FS.File.prototype.getBuffer = function() { ...``` [fsFile-data-get.js:139](fsFile-data-get.js#L139)

-


---
> File: ["fsFile-data-set.js"](fsFile-data-set.js)
> Where: {client|server}

-

#### <a name="FS.File.prototype.setDataFromUrl"></a>*fsFile*.setDataFromUrl(url, callback)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Converts ArrayBuffer or Buffer retrieved from URL to EJSON.binary data
and sets it. Asynchronous.
```
-
*This method __setDataFromUrl__ is defined in `prototype` of `FS.File`*

__Arguments__

* __url__ *{string}*  
* __callback__ *{function}*  
 callback(err)

-

__Returns__  *{undefined}*


> ```FS.File.prototype.setDataFromUrl = function(url, callback) { ...``` [fsFile-data-set.js:49](fsFile-data-set.js#L49)

-

#### <a name="FS.File.prototype.setDataFromBuffer"></a>*fsFile*.setDataFromBuffer(buffer, type)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Converts Buffer to EJSON.binary data and sets it
```
-
*This method __setDataFromBuffer__ is defined in `prototype` of `FS.File`*

__Arguments__

* __buffer__ *{Buffer}*  
 A Node buffer
* __type__ *{string}*  
 The content type of the data that's in the buffer

-

__Returns__  *{undefined}*



> ```FS.File.prototype.setDataFromBuffer = function(buffer, type) { ...``` [fsFile-data-set.js:98](fsFile-data-set.js#L98)

-

#### <a name="FS.File.prototype.setDataFromFile"></a>*fsFile*.setDataFromFile(filePath, [type], [callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Loads buffer from filesystem, converts Buffer to EJSON.binary data, and sets it
```
-
*This method __setDataFromFile__ is defined in `prototype` of `FS.File`*

__Arguments__

* __filePath__ *{string}*  
 The path to the file on the server filesystem.
* __type__ *{string}*    (Optional = "guessed from extension")
 The content type of the file
* __callback__ *{Function}*    (Optional)
 A callback that is potentially passed any error.

-

__Returns__  *{undefined}*



> ```FS.File.prototype.setDataFromFile = function(filePath, type, callback) { ...``` [fsFile-data-set.js:118](fsFile-data-set.js#L118)

-


---
> File: ["fsFile-client.js"](fsFile-client.js)
> Where: {client}

-

#### <a name="FS.File.fromUrl"></a>FS.File.fromUrl(url, filename, callback)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __fromUrl__ is defined in `FS.File`*

__Arguments__

* __url__ *{String}*  
* __filename__ *{String}*  
* __callback__ *{Function}*  

-

__Returns__  *{undefined}*

Loads data from `url` into a new FS.File with `name = filename`,
and then passes the new FS.File instance to `callback(err, fsFile)`.


> ```FS.File.fromUrl = function(url, filename, callback) { ...``` [fsFile-client.js:12](fsFile-client.js#L12)

-

#### <a name="FS.File.prototype.saveLocal"></a>*fsFile*.saveLocal([filename])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __saveLocal__ is defined in `prototype` of `FS.File`*

__Arguments__

* __filename__ *{String}*    (Optional)

-

__Returns__  *{undefined}*

Tells the browser to save the file like a normal downloaded file,
using the provided filename, or the `name` property if `filename`
is not provided.


> ```FS.File.prototype.saveLocal = function(filename) { ...``` [fsFile-client.js:34](fsFile-client.js#L34)

-

#### <a name="FS.File.prototype._get"></a>*fsFile*._get()&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*
*This method ___get__ is defined in `prototype` of `FS.File`*

> ```FS.File.prototype._get = function(options) { ...``` [fsFile-client.js:46](fsFile-client.js#L46)

-


---
> File: ["fsFile-server.js"](fsFile-server.js)
> Where: {server}

-

#### <a name="FS.File.prototype.logCopyFailure"></a>*fsFile*.logCopyFailure(storeName, maxTries)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
```
Notes a details about a storage adapter failure within the file record
```
-
*This method __logCopyFailure__ is defined in `prototype` of `FS.File`*

__Arguments__

* __storeName__ *{string}*  
* __maxTries__ *{number}*  

-

__Returns__  *{undefined}*


> ```FS.File.prototype.logCopyFailure = function(storeName, maxTries) { ...``` [fsFile-server.js:24](fsFile-server.js#L24)

-

#### <a name="FS.File.prototype.failedPermanently"></a>*fsFile*.failedPermanently(storeName)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
```
Has this store permanently failed?
```
-
*This method __failedPermanently__ is defined in `prototype` of `FS.File`*

__Arguments__

* __storeName__ *{String}*  
The name of the store

-

__Returns__  *{boolean}*
Has this store failed permanently?


> ```FS.File.prototype.failedPermanently = function(storeName) { ...``` [fsFile-server.js:56](fsFile-server.js#L56)

-

#### <a name="FS.File~newFsFileCallback"></a>FS.File~newFsFileCallback&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This callback __File~newFsFileCallback__ is defined in `FS`*

__Arguments__

* __error__ *{[Error](#Error)}*  
 An error, or null if successful
* __fsFile__ *{[FS.File](#FS.File)}*  
 A new FS.File instance, or `undefined` if there was an error

-


> ```FS.File.fromFile = function(filePath, filename, type, callback) { ...``` [fsFile-server.js:81](fsFile-server.js#L81)

-

#### <a name="FS.File.fromFile"></a>FS.File.fromFile(filePath, [filename], [type], callback)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
```
Loads data from a local path into a new FS.File and passes it to callback.
You must specify every argument, but the filename argument may be `null` to
extract it from the filePath.
```
-
*This method __fromFile__ is defined in `FS.File`*

__Arguments__

* __filePath__ *{string}*  
 The full path to the file on the local filesystem
* __filename__ *{string}*    (Optional = "extracted from filePath")
 The name to use for the new FS.File instance
* __type__ *{string}*    (Optional = "guessed from extension")
 The content type of the file
* __callback__ *{[FS.File~newFsFileCallback](#FS.File~newFsFileCallback)}*  

-

__Returns__  *{undefined}*



> ```FS.File.fromFile = function(filePath, filename, type, callback) { ...``` [fsFile-server.js:81](fsFile-server.js#L81)

-

#### <a name="FS.File.fromUrl"></a>FS.File.fromUrl(url, filename, callback)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
```
Loads data from a remote URL into a new FS.File and passes it to callback
```
-
*This method __fromUrl__ is defined in `FS.File`*

__Arguments__

* __url__ *{string}*  
 A full url that points to a remote file
* __filename__ *{string}*  
 The name to use for the new FS.File instance
* __callback__ *{[FS.File~newFsFileCallback](#FS.File~newFsFileCallback)}*  

-

__Returns__  *{undefined}*


> ```FS.File.fromUrl = function(url, filename, callback) { ...``` [fsFile-server.js:101](fsFile-server.js#L101)

-

#### <a name="FS.File.prototype._get"></a>*fsFile*._get()&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*
*This method ___get__ is defined in `prototype` of `FS.File`*

> ```FS.File.prototype._get = function(options) { ...``` [fsFile-server.js:118](fsFile-server.js#L118)

-
