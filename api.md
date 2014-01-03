
#### <a name="FS.File.prototype.reload"></a>*fsFile*.reload()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
> __Warning!__
> This method "FS.File.prototype.reload" has deprecated from the api
> We should not maintain duplicate data

*This method __reload__ is defined in `prototype` of `FS.File`*
> This function is deprecating - but we cannot remove it before all
> references are updated to use `FS.File.fetch()`

> ```FS.File.prototype.reload = function() { ...``` [fsFile/fsFile-common.js:68](fsFile/fsFile-common.js#L68)

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

> ```FS.File.prototype.url = function(options) { ...``` [fsFile/fsFile-common.js:194](fsFile/fsFile-common.js#L194)

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

> ```FS.File.prototype.downloadUrl = function(options) { ...``` [fsFile/fsFile-common.js:245](fsFile/fsFile-common.js#L245)

-

#### <a name="FS.File.prototype.put"></a>*fsFile*.put([callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __put__ is defined in `prototype` of `FS.File`*

__Arguments__

* __callback__ *{function}*    (Optional)
Callback for returning errors and id

-
```
fo.put(function(err, id) {
   if (err) {
     console.log('Got an error');
   } else {
     console.log('Passed on the file id: ' + id);
   }
 });
```

> ```FS.File.prototype.put = function(callback) { ...``` [fsFile/fsFile-common.js:265](fsFile/fsFile-common.js#L265)

-

#### <a name="FS.File.prototype.getExtension"></a>*fsFile*.getExtension()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __getExtension__ is defined in `prototype` of `FS.File`*

__Returns__  *{string | null}*
The extension eg.: `jpg`

> ```FS.File.prototype.getExtension = function() { ...``` [fsFile/fsFile-common.js:300](fsFile/fsFile-common.js#L300)

-

#### <a name="FS.File.prototype.fetch"></a>*fsFile*.fetch()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __fetch__ is defined in `prototype` of `FS.File`*

__Returns__  *{object}*
The filerecord

> ```FS.File.prototype.fetch = function() { ...``` [fsFile/fsFile-common.js:374](fsFile/fsFile-common.js#L374)

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

> ```FS.File.prototype.hasCopy = function(copyName, optimistic) { ...``` [fsFile/fsFile-common.js:392](fsFile/fsFile-common.js#L392)

-


---

#### <a name="FS.Collection.prototype.insert"></a>*fsCollection*.insert(fileRef, [callback])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __insert__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __fileRef__ *{[FS.File](#FS.File)|[File](#File)}*  
File data reference
* __callback__ *{function}*    (Optional)
Callback `function(error, fileObj)`

-

> ```FS.Collection.prototype.insert = function(fileRef, callback) { ...``` [fsCollection/api.common.js:7](fsCollection/api.common.js#L7)

-

#### <a name="FS.Collection.prototype.findOne"></a>*fsCollection*.findOne(selector)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __findOne__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __selector__ *{[selector](http://docs.meteor.com/#selectors)}*  

-
Example:
```js
var images = new FS.Collection( ... );
// Get the file object
var fo = images.findOne({ _id: 'NpnskCt6ippN6CgD8' });
```

> ```FS.Collection.prototype.findOne = function(selector) { ...``` [fsCollection/api.common.js:92](fsCollection/api.common.js#L92)

-

#### <a name="FS.Collection.prototype.find"></a>*fsCollection*.find(selector)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __find__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __selector__ *{[selector](http://docs.meteor.com/#selectors)}*  

-
Example:
```js
var images = new FS.Collection( ... );
// Get the all file objects
var files = images.find({ _id: 'NpnskCt6ippN6CgD8' }).fetch();
```

> ```FS.Collection.prototype.find = function(selector) { ...``` [fsCollection/api.common.js:107](fsCollection/api.common.js#L107)

-

#### <a name="FS.Collection.prototype.allow"></a>*fsCollection*.allow(options)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __allow__ is defined in `prototype` of `FS.Collection`*

__Arguments__

* __options__ *{[options](http://docs.meteor.com/#allow)}*  
    - __download__ *{function}*  
Function that checks if the file contents may be downloaded
    - __insert__ *{function}*  
    - __update__ *{function}*  
    - __remove__ *{function}*  
Functions that look at a proposed modification to the database and return true if it should be allowed
    - __fetch__ *{[string]}*    (Optional)
Optional performance enhancement. Limits the fields that will be fetched from the database for inspection by your update and remove functions

-
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

> ```FS.Collection.prototype.allow = function(options) { ...``` [fsCollection/api.common.js:131](fsCollection/api.common.js#L131)

-


---

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
