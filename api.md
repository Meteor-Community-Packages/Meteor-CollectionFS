
#### <a name="FS.Collection.acceptUploadFrom"></a>FS.Collection.acceptUploadFrom(templateName, selector, [metadata])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-

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

#### <a name="FS.Collection.acceptUploadFrom"></a>FS.Collection.acceptUploadFrom(templateName, selector, [metadata])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-

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
