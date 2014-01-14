> File: ["FileSaver.js"](FileSaver.js)
> Where: {client}

-

#### <a name="window.saveAs"></a>*window*.saveAs {any}&nbsp;&nbsp;<sub><i>Client</i></sub> ####
```
FileSaver.js
A saveAs() FileSaver implementation.
2013-01-23
By Eli Grey, http:
License: X11/MIT
 See LICENSE.md
```
-
*This property __saveAs__ is defined in `window`*

> ```window.saveAs = window.saveAs``` [FileSaver.js:16](FileSaver.js#L16)

-

#### <a name="window.saveAs"></a>*window*.saveAs {any}&nbsp;&nbsp;<sub><i>Client</i></sub> ####
```
global self jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
plusplus: true 
```
-
*This property __saveAs__ is defined in `window`*

> ```window.saveAs = window.saveAs``` [FileSaver.js:16](FileSaver.js#L16)

-


---
> File: ["fsFile/fsFile-common.js"](fsFile/fsFile-common.js)
> Where: {client|server}

-

#### <a name="FS.File"></a>new *fs*.File(ref)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
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

> ```FS.File = function(ref, createdByTransform) { ...``` [fsFile/fsFile-common.js:15](fsFile/fsFile-common.js#L15)

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

> ```FS.File.prototype.controlledByDeps = function() { ...``` [fsFile/fsFile-common.js:43](fsFile/fsFile-common.js#L43)

-

#### <a name="FS.File.prototype.getCollection"></a>*fsFile*.getCollection()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getCollection__ is defined in `prototype` of `FS.File`*

__Returns__  *{FS.Collection}*
Returns attatched collection or undefined if not mounted
> Note: This will throw an error if collection not found and file is mounted
(got an invalid collectionName)*

> ```FS.File.prototype.getCollection = function() { ...``` [fsFile/fsFile-common.js:54](fsFile/fsFile-common.js#L54)

-

#### <a name="FS.File.prototype.isMounted"></a>*fsFile*.isMounted()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __isMounted__ is defined in `prototype` of `FS.File`*

__Returns__  *{FS.Collection}*
Returns attatched collection or undefined if not mounted
> Note: This will throw an error if collection not found and file is mounted
(got an invalid collectionName)*

> ```FS.File.prototype.isMounted = FS.File.prototype.getCollection;``` [fsFile/fsFile-common.js:91](fsFile/fsFile-common.js#L91)

-

#### <a name="FS.File.prototype.fetch"></a>*fsFile*.fetch()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
> __Warning!__
> This method "FS.File.prototype.fetch" has deprecated from the api
> Refactored into [getFileRecord](#FS.File.prototype.getFileRecord)

*This method __fetch__ is defined in `prototype` of `FS.File`*

__Returns__  *{object}*
The filerecord

> ```FS.File.prototype.getFileRecord = function() { ...``` [fsFile/fsFile-common.js:102](fsFile/fsFile-common.js#L102)

-

#### <a name="FS.File.prototype.getFileRecord"></a>*fsFile*.getFileRecord()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getFileRecord__ is defined in `prototype` of `FS.File`*

__Returns__  *{object}*
The filerecord

> ```FS.File.prototype.getFileRecord = function() { ...``` [fsFile/fsFile-common.js:102](fsFile/fsFile-common.js#L102)

-

#### <a name="FS.File.prototype.useCollection"></a>*fsFile*.useCollection()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
> __Warning!__
> This method "FS.File.prototype.useCollection" has deprecated from the api
> We should use `getCollection()` istead - it practically does the same

*This method __useCollection__ is defined in `prototype` of `FS.File`*

> ```FS.File.prototype.update = function(modifier, options, callback) { ...``` [fsFile/fsFile-common.js:134](fsFile/fsFile-common.js#L134)

-

#### <a name="FS.File.prototype.update"></a>*fsFile*.update(modifier, [options], [callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __update__ is defined in `prototype` of `FS.File`*

__Arguments__

* __modifier__ *{[modifier](#modifier)}*  
* __options__ *{object}*    (Optional)
* __callback__ *{function}*    (Optional)

-

> ```FS.File.prototype.update = function(modifier, options, callback) { ...``` [fsFile/fsFile-common.js:134](fsFile/fsFile-common.js#L134)

-

#### <a name="FS.File.prototype.remove"></a>*fsFile*.remove()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __remove__ is defined in `prototype` of `FS.File`*

__Returns__  *{number}*
Count

__TODO__
```
* Test this
```
Remove the current file

> ```FS.File.prototype.remove = function() { ...``` [fsFile/fsFile-common.js:162](fsFile/fsFile-common.js#L162)

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

> ```FS.File.prototype.get = function(``` [fsFile/fsFile-common.js:198](fsFile/fsFile-common.js#L198)

-

#### <a name="FS.File.prototype.get"></a>*fsFile*.get([copyName], [start], [end])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __get__ is defined in `prototype` of `FS.File`*

__Arguments__

* __copyName__ *{string}*    (Optional = '_master')
Name of the copy version
* __start__ *{number}*    (Optional)
* __end__ *{number}*    (Optional)

-

__Returns__  *{number}*
Count

__TODO__
```
* Split server and client code
* Should we consider optionalising instead of arguments - deprecate parseArguments?
```
Remove the current file

> ```FS.File.prototype.get = function(``` [fsFile/fsFile-common.js:198](fsFile/fsFile-common.js#L198)

-

-
Client: Instructs the DownloadTransferQueue to begin downloading the file copy
Server: Returns the Buffer data for the copy

#### <a name="FS.File.prototype.url"></a>*fsFile*.url([options], [auth], [download])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __url__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __copy__ *{string}*    (Default = "_master")
The copy of the file to get
* __auth__ *{boolean}*    (Optional = null)
Wether or not the authenticate
* __download__ *{boolean}*    (Optional = true)
Should headers be set to force a download

-
Return the http url for getting the file - on server set auth if wanting to
use authentication on client set auth to true or token

> ```FS.File.prototype.url = function(options) { ...``` [fsFile/fsFile-common.js:256](fsFile/fsFile-common.js#L256)

-

#### <a name="FS.File.prototype.downloadUrl"></a>*fsFile*.downloadUrl([options], [auth])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
> __Warning!__
> This method "FS.File.prototype.downloadUrl" has deprecated from the api
> Use The hybrid helper `FS.File.url`

*This method __downloadUrl__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __copy__ *{string}*    (Default = "_master")
The copy of the file to get
* __auth__ *{boolean}*    (Optional = null)
Wether or not the authenticate

-

> ```FS.File.prototype.downloadUrl = function(options) { ...``` [fsFile/fsFile-common.js:309](fsFile/fsFile-common.js#L309)

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

> ```FS.File.prototype.put = function(callback) { ...``` [fsFile/fsFile-common.js:329](fsFile/fsFile-common.js#L329)

-

#### <a name="FS.File.prototype.getExtension"></a>*fsFile*.getExtension()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getExtension__ is defined in `prototype` of `FS.File`*

__Returns__  *{string}*
The extension eg.: `jpg` or if not found then an empty string ''

> ```FS.File.prototype.getExtension = function() { ...``` [fsFile/fsFile-common.js:362](fsFile/fsFile-common.js#L362)

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

> ```FS.File.prototype.toDataUrl = function(callback) { ...``` [fsFile/fsFile-common.js:376](fsFile/fsFile-common.js#L376)

-

#### <a name="FS.File.prototype.hasCopy"></a>*fsFile*.hasCopy(copyName, optimistic)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __hasCopy__ is defined in `prototype` of `FS.File`*

__Arguments__

* __copyName__ *{string}*  
Name of the copy to check for
* __optimistic__ *{boolean}*  
In case that the file record is not found, read below

-

__Returns__  *{boolean}*
If the copy exists or not
> Note: If the file is not published to the client or simply not found:
> this method cannot know for sure if it exists or not. The `optimistic`
> param is the boolean value to return. Are we `optimistic` that the copy
> could exist. This is the case in `FS.File.url` we are optimistic that the
> copy supplied by the user exists.

> ```FS.File.prototype.hasCopy = function(copyName, optimistic) { ...``` [fsFile/fsFile-common.js:450](fsFile/fsFile-common.js#L450)

-


---
> File: ["fsCollection/api.common.js"](fsCollection/api.common.js)
> Where: {client|server}

-

#### <a name="FS.Collection.prototype.insert"></a>*fsCollection*.insert(fileRef, [callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __insert__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __fileRef__ *{[FS.File](#FS.File)|[File](#File)}*  
File data reference
* __callback__ *{function}*    (Optional)
Callback `function(error, fileObj)`

-

__Returns__  *{FS.File}*
The `file object`
[Meteor docs](http://docs.meteor.com/#insert)

> ```FS.Collection.prototype.insert = function(fileRef, callback) { ...``` [fsCollection/api.common.js:9](fsCollection/api.common.js#L9)

-

#### <a name="FS.Collection.prototype.update"></a>*fsCollection*.update(selector, modifier, options)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __update__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __selector__ *{[FS.File](#FS.File)|object}*  
* __modifier__ *{object}*  
* __options__ *{object}*  

-
[Meteor docs](http://docs.meteor.com/#update)

> ```FS.Collection.prototype.update = function(selector, modifier, options) { ...``` [fsCollection/api.common.js:60](fsCollection/api.common.js#L60)

-

#### <a name="FS.Collection.prototype.update"></a>*fsCollection*.update(selector, modifier, options)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __update__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __selector__ *{[FS.File](#FS.File)|object}*  
* __modifier__ *{object}*  
* __options__ *{object}*  

-
[Meteor docs](http://docs.meteor.com/#remove)

> ```FS.Collection.prototype.remove = function(selector, callback) { ...``` [fsCollection/api.common.js:84](fsCollection/api.common.js#L84)

-

#### <a name="FS.Collection.prototype.findOne"></a>*fsCollection*.findOne(selector)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __findOne__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __selector__ *{[selector](http://docs.meteor.com/#selectors)}*  

-
[Meteor docs](http://docs.meteor.com/#findone)
Example:
```js
var images = new FS.Collection( ... );
// Get the file object
var fo = images.findOne({ _id: 'NpnskCt6ippN6CgD8' });
```

> ```FS.Collection.prototype.findOne = function(selector) { ...``` [fsCollection/api.common.js:106](fsCollection/api.common.js#L106)

-

#### <a name="FS.Collection.prototype.find"></a>*fsCollection*.find(selector)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __find__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __selector__ *{[selector](http://docs.meteor.com/#selectors)}*  

-
[Meteor docs](http://docs.meteor.com/#find)
Example:
```js
var images = new FS.Collection( ... );
// Get the all file objects
var files = images.find({ _id: 'NpnskCt6ippN6CgD8' }).fetch();
```

> ```FS.Collection.prototype.find = function(selector) { ...``` [fsCollection/api.common.js:122](fsCollection/api.common.js#L122)

-

#### <a name="FS.Collection.prototype.allow"></a>*fsCollection*.allow(options)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __allow__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __options__ *{object}*  
    - __download__ *{function}*  
Function that checks if the file contents may be downloaded
    - __insert__ *{function}*  
    - __update__ *{function}*  
    - __remove__ *{function}*  
Functions that look at a proposed modification to the database and return true if it should be allowed
    - __fetch__ *{[string]}*    (Optional)
Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your update and remove functions

-
[Meteor docs](http://docs.meteor.com/#allow)
Example:
```js
var images = new FS.Collection( ... );
// Get the all file objects
var files = images.allow({
  insert: function(userId, doc) { return true; },
  update: function(userId, doc, fields, modifier) { return true; },
  remove: function(userId, doc) { return true; },
  download: function(userId, fileObj) { return true; },
});
```

> ```FS.Collection.prototype.allow = function(options) { ...``` [fsCollection/api.common.js:147](fsCollection/api.common.js#L147)

-

#### <a name="FS.Collection.prototype.deny"></a>*fsCollection*.deny(options)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __deny__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __options__ *{object}*  
    - __download__ *{function}*  
Function that checks if the file contents may be downloaded
    - __insert__ *{function}*  
    - __update__ *{function}*  
    - __remove__ *{function}*  
Functions that look at a proposed modification to the database and return true if it should be denyed
    - __fetch__ *{[string]}*    (Optional)
Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your update and remove functions

-
[Meteor docs](http://docs.meteor.com/#deny)
Example:
```js
var images = new FS.Collection( ... );
// Get the all file objects
var files = images.deny({
  insert: function(userId, doc) { return true; },
  update: function(userId, doc, fields, modifier) { return true; },
  remove: function(userId, doc) { return true; },
  download: function(userId, fileObj) { return true; },
});
```

> ```FS.Collection.prototype.deny = function(options) { ...``` [fsCollection/api.common.js:182](fsCollection/api.common.js#L182)

-


---
> File: ["fsCollection/api.client.js"](fsCollection/api.client.js)
> Where: {client}

-

#### <a name="_eventCallback"></a>_eventCallback(templateName, selector, dataContext, evt, temp, fsFile)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*

__Arguments__

* __templateName__ *{string}*  
Name of template to apply events on
* __selector__ *{string}*  
The element selector eg. "#uploadField"
* __dataContext__ *{object}*  
The event datacontext
* __evt__ *{object}*  
The event object { error, file }
* __temp__ *{object}*  
The template instance
* __fsFile__ *{[FS.File](#FS.File)}*  
File that triggered the event

-

> ```var _eventCallback = function(templateName, selector, dataContext, evt, temp, fsFile) { ...``` [fsCollection/api.client.js:10](fsCollection/api.client.js#L10)

-

#### <a name="_eachFile"></a>_eachFile(files, metadata, callback)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*

__Arguments__

* __files__ *{array}*  
List of files to iterate over
* __metadata__ *{object}*  
Data to attach to the files
* __callback__ *{function}*  
Function to pass the prepared `FS.File` object

-

> ```var _eachFile = function(files, metadata, callback) { ...``` [fsCollection/api.client.js:36](fsCollection/api.client.js#L36)

-

#### <a name="FS.Collection.acceptDropsOn"></a>*fsCollection*.acceptDropsOn(templateName, selector, [metadata])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __acceptDropsOn__ is defined in `FS.Collection`*

__Arguments__

* __templateName__ *{string}*  
Name of template to apply events on
* __selector__ *{string}*  
The element selector eg. "#uploadField"
* __metadata__ *{object|function}*    (Optional)
Data/getter to attach to the file objects

-
Using this method adds an `uploaded` and `uploadFailed` event to the
template events. The event object contains `{ error, file }`
Example:
```css
.dropzone {
border: 2px dashed silver; 
height: 5em;
padding-top: 3em;
-webkit-border-radius: 8px;
-moz-border-radius: 8px;
-ms-border-radius: 8px;
-o-border-radius: 8px;
border-radius: 8px;
}
```
```html
<template name="hello">
Choose file to upload:<br/>
<div id="dropzone" class="dropzone">
<div style="text-align: center; color: gray;">Drop file to upload</div>
</div>
</template>
```
```js
Template.hello.events({
  'uploaded #dropzone': function(event, temp) {
    console.log('Event Uploaded: ' + event.file._id);
  }
});
images.acceptDropsOn('hello', '#dropzone');
```

> ```FS.Collection.prototype.acceptDropsOn = function(templateName, selector, metadata) { ...``` [fsCollection/api.client.js:99](fsCollection/api.client.js#L99)

-

#### <a name="FS.Collection.acceptUploadFrom"></a>*fsCollection*.acceptUploadFrom(templateName, selector, [metadata])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __acceptUploadFrom__ is defined in `FS.Collection`*

__Arguments__

* __templateName__ *{string}*  
Name of template to apply events on
* __selector__ *{string}*  
The element selector eg. "#uploadField"
* __metadata__ *{object|function}*    (Optional)
Data/getter to attach to the file objects

-
Using this method adds an `uploaded` and `uploadFailed` event to the
template events. The event object contains `{ error, file }`
Example:
```html
<template name="hello">
Choose file to upload:<br/>
<input type="file" id="files" multiple/>
</template>
```
```js
Template.hello.events({
  'uploaded #files': function(event, temp) {
    console.log('Event Uploaded: ' + event.file._id);
  }
});
images.acceptUploadFrom('hello', '#files');
```

> ```FS.Collection.prototype.acceptUploadFrom = function(templateName, selector, metadata) { ...``` [fsCollection/api.client.js:154](fsCollection/api.client.js#L154)

-


---
> File: ["tempStore.js"](tempStore.js)
> Where: {server}

-
#Temporary Storage 
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
tmp = Npm.require('temp');

#### <a name="TempStore"></a>TempStore {object}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-

> ```TempStore = { ...``` [tempStore.js:21](tempStore.js#L21)

-

#### <a name="TempStore.saveChunk"></a>*tempstore*.saveChunk(fsFile, binary, start, callback)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __saveChunk__ is defined in `TempStore`*

__Arguments__

* __fsFile__ *{[FS.File](#FS.File)}*  
* __binary__ *{binary}*  
* __start__ *{number}*  
* __callback__ *{function}*  
callback(err, allBytesLoaded)

-

> ```saveChunk: function(fileObj, binary, start, callback) { ...``` [tempStore.js:29](tempStore.js#L29)

-

#### <a name="TempStore.getDataForFile"></a>*tempstore*.getDataForFile(fileObj, callback)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __getDataForFile__ is defined in `TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
* __callback__ *{function}*  
callback(err, fileObjWithData)

-

> ```getDataForFile: function(fileObj, callback) { ...``` [tempStore.js:77](tempStore.js#L77)

-

#### <a name="TempStore.deleteChunks"></a>*tempstore*.deleteChunks(fileObj, callback)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __deleteChunks__ is defined in `TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
* __callback__ *{function}*  
callback(err)

-

> ```deleteChunks: function(fileObj, callback) { ...``` [tempStore.js:110](tempStore.js#L110)

-

#### <a name="TempStore.ensureForFile"></a>*tempstore*.ensureForFile(fileObj, callback)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __ensureForFile__ is defined in `TempStore`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
* __callback__ *{function}*  
callback(err, allBytesLoaded)

-

> ```ensureForFile: function (fileObj, callback) { ...``` [tempStore.js:156](tempStore.js#L156)

-
