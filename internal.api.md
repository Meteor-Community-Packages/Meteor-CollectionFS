> File: ["FileSaver.js"](FileSaver.js)
> Where: {client}

-

#### <a name=""></a>&nbsp;&nbsp;<sub><i>undefined</i></sub> ####
```
FileSaver.js
A saveAs() FileSaver implementation.
2013-01-23
By Eli Grey, http:
License: X11/MIT
 See LICENSE.md
global self jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
plusplus: true ! @source http:
window.saveAs = window.saveAs
|| (navigator.msSaveBlob && navigator.msSaveBlob.bind(navigator))
|| (function(view) {
	"use strict";
	var
		  doc = view.document
		  // only get URL when necessary in case BlobBuilder.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, URL = view.URL || view.webkitURL || view
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = doc.createEvent("MouseEvents");
			event.initMouseEvent(
				"click", true, false, view, 0, 0, 0, 0, 0
				, false, false, false, false, 0, null
			);
			node.dispatchEvent(event);
		}
		, webkit_req_fs = view.webkitRequestFileSystem
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
		, throw_outside = function (ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		, fs_min_size = 0
		, deletion_queue = []
		, process_deletion_queue = function() {
			var i = deletion_queue.length;
			while (i--) {
				var file = deletion_queue[i];
				if (typeof file === "string") { // file is an object URL
					URL.revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			}
			deletion_queue.length = 0; // clear queue
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, FileSaver = function(blob, name) {
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, blob_changed = false
				, object_url
				, target_view
				, get_object_url = function() {
					var object_url = get_URL().createObjectURL(blob);
					deletion_queue.push(object_url);
					return object_url;
				}
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					// don't create more object URLs than needed
					if (blob_changed || !object_url) {
						object_url = get_object_url(blob);
					}
					if (target_view) {
						target_view.location.href = object_url;
					} else {
                      window.open(object_url, "_blank");
                  }
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
				}
				, abortable = function(func) {
					return function() {
						if (filesaver.readyState !== filesaver.DONE) {
							return func.apply(this, arguments);
						}
					};
				}
				, create_if_not_found = {create: true, exclusive: false}
				, slice
			;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_object_url(blob);
				save_link.href = object_url;
				save_link.download = name;
				click(save_link);
				filesaver.readyState = filesaver.DONE;
				dispatch_all();
				return;
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name += ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
					var save = function() {
						dir.getFile(name, create_if_not_found, abortable(function(file) {
							file.createWriter(abortable(function(writer) {
								writer.onwriteend = function(event) {
									target_view.location.href = file.toURL();
									deletion_queue.push(file);
									filesaver.readyState = filesaver.DONE;
									dispatch(filesaver, "writeend", event);
								};
								writer.onerror = function() {
									var error = writer.error;
									if (error.code !== error.ABORT_ERR) {
										fs_error();
									}
								};
								"writestart progress write abort".split(" ").forEach(function(event) {
									writer["on" + event] = filesaver["on" + event];
								});
								writer.write(blob);
								filesaver.abort = function() {
									writer.abort();
									filesaver.readyState = filesaver.DONE;
								};
								filesaver.readyState = filesaver.WRITING;
							}), fs_error);
						}), fs_error);
					};
					dir.getFile(name, {create: false}, abortable(function(file) {
						// delete file if it already exists
						file.remove();
						save();
					}), abortable(function(ex) {
						if (ex.code === ex.NOT_FOUND_ERR) {
							save();
						} else {
							fs_error();
						}
					}));
				}), fs_error);
			}), fs_error);
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name) {
			return new FileSaver(blob, name);
		}
	;
	FS_proto.abort = function() {
		var filesaver = this;
		filesaver.readyState = filesaver.DONE;
		dispatch(filesaver, "abort");
	};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;
	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;
	view.addEventListener("unload", process_deletion_queue, false);
	return saveAs;
}(self));
```
-

-


---
> File: ["fsFile/fsFile-common.js"](fsFile/fsFile-common.js)
> Where: {client|server}

-

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
__TODO__
```
* We have to make this function be able to get the name from `self.fetch()`
```

> ```FS.File.prototype.getExtension = function() { ...``` [fsFile/fsFile-common.js:299](fsFile/fsFile-common.js#L299)

-

#### <a name="FS.File.prototype.fetch"></a>*fsFile*.fetch()&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __fetch__ is defined in `prototype` of `FS.File`*

__Returns__  *{object}*
The filerecord

> ```FS.File.prototype.fetch = function() { ...``` [fsFile/fsFile-common.js:373](fsFile/fsFile-common.js#L373)

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

> ```FS.File.prototype.hasCopy = function(copyName, optimistic) { ...``` [fsFile/fsFile-common.js:391](fsFile/fsFile-common.js#L391)

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

> ```FS.Collection.prototype.update = function(selector, modifier, options) { ...``` [fsCollection/api.common.js:61](fsCollection/api.common.js#L61)

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

> ```FS.Collection.prototype.remove = function(selector, callback) { ...``` [fsCollection/api.common.js:85](fsCollection/api.common.js#L85)

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

> ```FS.Collection.prototype.findOne = function(selector) { ...``` [fsCollection/api.common.js:107](fsCollection/api.common.js#L107)

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

> ```FS.Collection.prototype.find = function(selector) { ...``` [fsCollection/api.common.js:123](fsCollection/api.common.js#L123)

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

> ```FS.Collection.prototype.allow = function(options) { ...``` [fsCollection/api.common.js:148](fsCollection/api.common.js#L148)

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

> ```FS.Collection.prototype.deny = function(options) { ...``` [fsCollection/api.common.js:183](fsCollection/api.common.js#L183)

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

#### <a name="TempStore"></a>TempStore {object}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-

> ```TempStore = { ...``` [tempStore.js:19](tempStore.js#L19)

-

#### <a name="TempStore.saveChunk"></a>*tempstore*.saveChunk(fsFile, binary, start, callback(err, allBytesLoaded))&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __saveChunk__ is defined in `TempStore`*

__Arguments__

* __fsFile__ *{[FS.File](#FS.File)}*  
* __binary__ *{binary}*  
* __start__ *{number}*  
* __callback(err, allBytesLoaded)__ *{function}*  

-

> ```saveChunk: function(fsFile, binary, start, callback) { ...``` [tempStore.js:27](tempStore.js#L27)

-

#### <a name="TempStore.getDataForFile"></a>*tempstore*.getDataForFile(fsFile, callback(err, fsFileWithData))&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __getDataForFile__ is defined in `TempStore`*

__Arguments__

* __fsFile__ *{[FS.File](#FS.File)}*  
* __callback(err, fsFileWithData)__ *{function}*  

-

> ```getDataForFile: function(fsFile, callback) { ...``` [tempStore.js:73](tempStore.js#L73)

-

#### <a name="TempStore.deleteChunks"></a>*tempstore*.deleteChunks(fsFile, callback(err))&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __deleteChunks__ is defined in `TempStore`*

__Arguments__

* __fsFile__ *{[FS.File](#FS.File)}*  
* __callback(err)__ *{function}*  

-

> ```deleteChunks: function(fsFile, callback) { ...``` [tempStore.js:106](tempStore.js#L106)

-

#### <a name="TempStore.ensureForFile"></a>*tempstore*.ensureForFile(fsFile, callback(err, allBytesLoaded))&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __ensureForFile__ is defined in `TempStore`*

__Arguments__

* __fsFile__ *{[FS.File](#FS.File)}*  
* __callback(err, allBytesLoaded)__ *{function}*  

-

> ```ensureForFile: function (fsFile, callback) { ...``` [tempStore.js:153](tempStore.js#L153)

-
