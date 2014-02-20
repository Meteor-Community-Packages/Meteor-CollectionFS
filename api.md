
#### <a name="FS.File"></a>new FS.File(ref)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __File__ is defined in `FS`*

__Arguments__

* __ref__ *{object|[File](#File)|[Blob](#Blob)}*  
File reference

-


> ```FS.File = function(ref, createdByTransform) { ...``` [fsFile-common.js:9](fsFile-common.js#L9)

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

> ```FS.File.prototype.downloadUrl = function(options) { ...``` [fsFile-common.js:322](fsFile-common.js#L322)

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

> ```FS.File.prototype.put = function(callback) { ...``` [fsFile-common.js:344](fsFile-common.js#L344)

-

#### <a name="FS.File.prototype.resume"></a>*fsFile*.resume(ref)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __resume__ is defined in `prototype` of `FS.File`*

__Arguments__

* __ref__ *{[File](#File)|[Blob](#Blob)|Buffer}*  

-


> This function is not yet implemented for server

> ```FS.File.prototype.resume = function(ref) { ...``` [fsFile-common.js:374](fsFile-common.js#L374)

-

#### <a name="FS.File.prototype.getExtension"></a>*fsFile*.getExtension()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getExtension__ is defined in `prototype` of `FS.File`*

__Returns__  *{string}*
The extension eg.: `jpg` or if not found then an empty string ''


> ```FS.File.prototype.getExtension = function() { ...``` [fsFile-common.js:387](fsFile-common.js#L387)

-

#### <a name="FS.File.prototype.toDataUrl"></a>*fsFile*.toDataUrl(callback)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __toDataUrl__ is defined in `prototype` of `FS.File`*

__Arguments__

* __callback__ *{function}*  
Callback(err, dataUrl) (callback is optional on server)

-


> ```FS.File.prototype.toDataUrl = function(callback) { ...``` [fsFile-common.js:405](fsFile-common.js#L405)

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

> ```FS.File.prototype.isImage = function(options) { ...``` [fsFile-common.js:475](fsFile-common.js#L475)

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

> ```FS.File.prototype.isVideo = function(options) { ...``` [fsFile-common.js:490](fsFile-common.js#L490)

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

> ```FS.File.prototype.isAudio = function(options) { ...``` [fsFile-common.js:505](fsFile-common.js#L505)

-

#### <a name="FS.File.prototype.isUploaded"></a>*fsFile*.isUploaded()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isUploaded__ is defined in `prototype` of `FS.File`*

__Returns__  *{boolean}*
True if the number of uploaded bytes is equal to the file size.


> ```FS.File.prototype.isUploaded = function() { ...``` [fsFile-common.js:514](fsFile-common.js#L514)

-

#### <a name="FS.File.prototype.chunkIsUploaded"></a>*fsFile*.chunkIsUploaded(start)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __chunkIsUploaded__ is defined in `prototype` of `FS.File`*

__Arguments__

* __start__ *{number}*  

-

__Returns__  *{boolean}*
True if the chunk starting at start has already been uploaded successfully.


> ```FS.File.prototype.chunkIsUploaded = function(start) { ...``` [fsFile-common.js:529](fsFile-common.js#L529)

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

> ```FS.File.prototype.hasCopy = function(storeName, optimistic) { ...``` [fsFile-common.js:551](fsFile-common.js#L551)

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


> ```FS.File.prototype.getCopyInfo = function(storeName) { ...``` [fsFile-common.js:571](fsFile-common.js#L571)

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


> ```FS.File.prototype.fileIsAllowed = function() { ...``` [fsFile-common.js:590](fsFile-common.js#L590)

-


---

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
