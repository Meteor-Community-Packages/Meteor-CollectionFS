> File: ["FileSaver.js"](FileSaver.js)
> Where: {client}

-

#### <a name=""></a>&nbsp;&nbsp;<sub><i>undefined</i></sub> ####
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
-

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
* __fsFile__ *{FS.File}*  
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


---
> File: ["tempStore.js"](tempStore.js)
> Where: {server}

-

#### <a name="TempStore"></a>TempStore {any}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
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
-

> ```TempStore = { ...``` [tempStore.js:16](tempStore.js#L16)

-
