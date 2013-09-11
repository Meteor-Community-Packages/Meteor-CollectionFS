(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/myConsole.js                                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/* Just a simple console to get server console in client, Regz. RaiX 2013 */                                        // 1
                                                                                                                    // 2
// Set true to get all logs from server start                                                                       // 3
var getAllLogs = false;                                                                                             // 4
// Enable / disable logging                                                                                         // 5
var debug = false;                                                                                                  // 6
                                                                                                                    // 7
if (!Meteor.Collection) {                                                                                           // 8
  console.log('No meteor??');                                                                                       // 9
}                                                                                                                   // 10
                                                                                                                    // 11
var myConsole = new Meteor.Collection('_console');                                                                  // 12
                                                                                                                    // 13
serverConsole = {                                                                                                   // 14
	log: function (message) {                                                                                          // 15
		if (debug) {                                                                                                      // 16
			console.log(message);                                                                                            // 17
			myConsole.insert({ message: message, createdAt: Date.now() });                                                   // 18
		}                                                                                                                 // 19
	}                                                                                                                  // 20
};                                                                                                                  // 21
                                                                                                                    // 22
var timeConsole = Date.now();                                                                                       // 23
                                                                                                                    // 24
if (Meteor.isClient && debug) {                                                                                     // 25
	Meteor.call('getTime', function(error, result) {                                                                   // 26
		timeConsole = +result;                                                                                            // 27
		if (error)                                                                                                        // 28
			console.log('getTime error: '+error.message);                                                                    // 29
		console.log('Got server time: '+result);                                                                          // 30
		Deps.autorun(function() {                                                                                         // 31
			myConsole.find({ createdAt: { $gt: timeConsole } }).forEach(function(doc) {                                      // 32
				console.log('SERVER: ' + doc.message);                                                                          // 33
				timeConsole = doc.createdAt;                                                                                    // 34
			});                                                                                                              // 35
		});                                                                                                               // 36
	});                                                                                                                // 37
                                                                                                                    // 38
	if (debug)                                                                                                         // 39
		Meteor.subscribe('myConsole');                                                                                    // 40
}                                                                                                                   // 41
                                                                                                                    // 42
if (Meteor.isServer && debug) {                                                                                     // 43
                                                                                                                    // 44
	myConsole.remove({});                                                                                              // 45
                                                                                                                    // 46
	if (debug)                                                                                                         // 47
		Meteor.publish('myConsole', function() {                                                                          // 48
			return myConsole.find({ createdAt : { $gt: timeConsole } });                                                     // 49
		}, {is_auto: true});                                                                                              // 50
                                                                                                                    // 51
	Meteor.methods({                                                                                                   // 52
		getTime: function() {                                                                                             // 53
			serverConsole.log('getTime');                                                                                    // 54
			return (getAllLogs)? 0 : Date.now()-20000; // Just add a little slack                                            // 55
		}                                                                                                                 // 56
	});                                                                                                                // 57
}                                                                                                                   // 58
                                                                                                                    // 59
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/FileSaver.js                                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/* FileSaver.js                                                                                                     // 1
 * A saveAs() FileSaver implementation.                                                                             // 2
 * 2013-01-23                                                                                                       // 3
 *                                                                                                                  // 4
 * By Eli Grey, http://eligrey.com                                                                                  // 5
 * License: X11/MIT                                                                                                 // 6
 *   See LICENSE.md                                                                                                 // 7
 */                                                                                                                 // 8
                                                                                                                    // 9
/*global self */                                                                                                    // 10
/*jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,                          // 11
  plusplus: true */                                                                                                 // 12
                                                                                                                    // 13
/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */                                 // 14
                                                                                                                    // 15
window.saveAs = window.saveAs                                                                                       // 16
  || (navigator.msSaveBlob && navigator.msSaveBlob.bind(navigator))                                                 // 17
  || (function(view) {                                                                                              // 18
	"use strict";                                                                                                      // 19
	var                                                                                                                // 20
		  doc = view.document                                                                                             // 21
		  // only get URL when necessary in case BlobBuilder.js hasn't overridden it yet                                  // 22
		, get_URL = function() {                                                                                          // 23
			return view.URL || view.webkitURL || view;                                                                       // 24
		}                                                                                                                 // 25
		, URL = view.URL || view.webkitURL || view                                                                        // 26
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")                                            // 27
		, can_use_save_link = "download" in save_link                                                                     // 28
		, click = function(node) {                                                                                        // 29
			var event = doc.createEvent("MouseEvents");                                                                      // 30
			event.initMouseEvent(                                                                                            // 31
				"click", true, false, view, 0, 0, 0, 0, 0                                                                       // 32
				, false, false, false, false, 0, null                                                                           // 33
			);                                                                                                               // 34
			node.dispatchEvent(event);                                                                                       // 35
		}                                                                                                                 // 36
		, webkit_req_fs = view.webkitRequestFileSystem                                                                    // 37
		, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem                                   // 38
		, throw_outside = function (ex) {                                                                                 // 39
			(view.setImmediate || view.setTimeout)(function() {                                                              // 40
				throw ex;                                                                                                       // 41
			}, 0);                                                                                                           // 42
		}                                                                                                                 // 43
		, force_saveable_type = "application/octet-stream"                                                                // 44
		, fs_min_size = 0                                                                                                 // 45
		, deletion_queue = []                                                                                             // 46
		, process_deletion_queue = function() {                                                                           // 47
			var i = deletion_queue.length;                                                                                   // 48
			while (i--) {                                                                                                    // 49
				var file = deletion_queue[i];                                                                                   // 50
				if (typeof file === "string") { // file is an object URL                                                        // 51
					URL.revokeObjectURL(file);                                                                                     // 52
				} else { // file is a File                                                                                      // 53
					file.remove();                                                                                                 // 54
				}                                                                                                               // 55
			}                                                                                                                // 56
			deletion_queue.length = 0; // clear queue                                                                        // 57
		}                                                                                                                 // 58
		, dispatch = function(filesaver, event_types, event) {                                                            // 59
			event_types = [].concat(event_types);                                                                            // 60
			var i = event_types.length;                                                                                      // 61
			while (i--) {                                                                                                    // 62
				var listener = filesaver["on" + event_types[i]];                                                                // 63
				if (typeof listener === "function") {                                                                           // 64
					try {                                                                                                          // 65
						listener.call(filesaver, event || filesaver);                                                                 // 66
					} catch (ex) {                                                                                                 // 67
						throw_outside(ex);                                                                                            // 68
					}                                                                                                              // 69
				}                                                                                                               // 70
			}                                                                                                                // 71
		}                                                                                                                 // 72
		, FileSaver = function(blob, name) {                                                                              // 73
			// First try a.download, then web filesystem, then object URLs                                                   // 74
			var                                                                                                              // 75
				  filesaver = this                                                                                              // 76
				, type = blob.type                                                                                              // 77
				, blob_changed = false                                                                                          // 78
				, object_url                                                                                                    // 79
				, target_view                                                                                                   // 80
				, get_object_url = function() {                                                                                 // 81
					var object_url = get_URL().createObjectURL(blob);                                                              // 82
					deletion_queue.push(object_url);                                                                               // 83
					return object_url;                                                                                             // 84
				}                                                                                                               // 85
				, dispatch_all = function() {                                                                                   // 86
					dispatch(filesaver, "writestart progress write writeend".split(" "));                                          // 87
				}                                                                                                               // 88
				// on any filesys errors revert to saving with object URLs                                                      // 89
				, fs_error = function() {                                                                                       // 90
					// don't create more object URLs than needed                                                                   // 91
					if (blob_changed || !object_url) {                                                                             // 92
						object_url = get_object_url(blob);                                                                            // 93
					}                                                                                                              // 94
					if (target_view) {                                                                                             // 95
						target_view.location.href = object_url;                                                                       // 96
					} else {                                                                                                       // 97
                        window.open(object_url, "_blank");                                                          // 98
                    }                                                                                               // 99
					filesaver.readyState = filesaver.DONE;                                                                         // 100
					dispatch_all();                                                                                                // 101
				}                                                                                                               // 102
				, abortable = function(func) {                                                                                  // 103
					return function() {                                                                                            // 104
						if (filesaver.readyState !== filesaver.DONE) {                                                                // 105
							return func.apply(this, arguments);                                                                          // 106
						}                                                                                                             // 107
					};                                                                                                             // 108
				}                                                                                                               // 109
				, create_if_not_found = {create: true, exclusive: false}                                                        // 110
				, slice                                                                                                         // 111
			;                                                                                                                // 112
			filesaver.readyState = filesaver.INIT;                                                                           // 113
			if (!name) {                                                                                                     // 114
				name = "download";                                                                                              // 115
			}                                                                                                                // 116
			if (can_use_save_link) {                                                                                         // 117
				object_url = get_object_url(blob);                                                                              // 118
				save_link.href = object_url;                                                                                    // 119
				save_link.download = name;                                                                                      // 120
				click(save_link);                                                                                               // 121
				filesaver.readyState = filesaver.DONE;                                                                          // 122
				dispatch_all();                                                                                                 // 123
				return;                                                                                                         // 124
			}                                                                                                                // 125
			// Object and web filesystem URLs have a problem saving in Google Chrome when                                    // 126
			// viewed in a tab, so I force save with application/octet-stream                                                // 127
			// http://code.google.com/p/chromium/issues/detail?id=91158                                                      // 128
			if (view.chrome && type && type !== force_saveable_type) {                                                       // 129
				slice = blob.slice || blob.webkitSlice;                                                                         // 130
				blob = slice.call(blob, 0, blob.size, force_saveable_type);                                                     // 131
				blob_changed = true;                                                                                            // 132
			}                                                                                                                // 133
			// Since I can't be sure that the guessed media type will trigger a download                                     // 134
			// in WebKit, I append .download to the filename.                                                                // 135
			// https://bugs.webkit.org/show_bug.cgi?id=65440                                                                 // 136
			if (webkit_req_fs && name !== "download") {                                                                      // 137
				name += ".download";                                                                                            // 138
			}                                                                                                                // 139
			if (type === force_saveable_type || webkit_req_fs) {                                                             // 140
				target_view = view;                                                                                             // 141
			}                                                                                                                // 142
			if (!req_fs) {                                                                                                   // 143
				fs_error();                                                                                                     // 144
				return;                                                                                                         // 145
			}                                                                                                                // 146
			fs_min_size += blob.size;                                                                                        // 147
			req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {                                                     // 148
				fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {                                    // 149
					var save = function() {                                                                                        // 150
						dir.getFile(name, create_if_not_found, abortable(function(file) {                                             // 151
							file.createWriter(abortable(function(writer) {                                                               // 152
								writer.onwriteend = function(event) {                                                                       // 153
									target_view.location.href = file.toURL();                                                                  // 154
									deletion_queue.push(file);                                                                                 // 155
									filesaver.readyState = filesaver.DONE;                                                                     // 156
									dispatch(filesaver, "writeend", event);                                                                    // 157
								};                                                                                                          // 158
								writer.onerror = function() {                                                                               // 159
									var error = writer.error;                                                                                  // 160
									if (error.code !== error.ABORT_ERR) {                                                                      // 161
										fs_error();                                                                                               // 162
									}                                                                                                          // 163
								};                                                                                                          // 164
								"writestart progress write abort".split(" ").forEach(function(event) {                                      // 165
									writer["on" + event] = filesaver["on" + event];                                                            // 166
								});                                                                                                         // 167
								writer.write(blob);                                                                                         // 168
								filesaver.abort = function() {                                                                              // 169
									writer.abort();                                                                                            // 170
									filesaver.readyState = filesaver.DONE;                                                                     // 171
								};                                                                                                          // 172
								filesaver.readyState = filesaver.WRITING;                                                                   // 173
							}), fs_error);                                                                                               // 174
						}), fs_error);                                                                                                // 175
					};                                                                                                             // 176
					dir.getFile(name, {create: false}, abortable(function(file) {                                                  // 177
						// delete file if it already exists                                                                           // 178
						file.remove();                                                                                                // 179
						save();                                                                                                       // 180
					}), abortable(function(ex) {                                                                                   // 181
						if (ex.code === ex.NOT_FOUND_ERR) {                                                                           // 182
							save();                                                                                                      // 183
						} else {                                                                                                      // 184
							fs_error();                                                                                                  // 185
						}                                                                                                             // 186
					}));                                                                                                           // 187
				}), fs_error);                                                                                                  // 188
			}), fs_error);                                                                                                   // 189
		}                                                                                                                 // 190
		, FS_proto = FileSaver.prototype                                                                                  // 191
		, saveAs = function(blob, name) {                                                                                 // 192
			return new FileSaver(blob, name);                                                                                // 193
		}                                                                                                                 // 194
	;                                                                                                                  // 195
	FS_proto.abort = function() {                                                                                      // 196
		var filesaver = this;                                                                                             // 197
		filesaver.readyState = filesaver.DONE;                                                                            // 198
		dispatch(filesaver, "abort");                                                                                     // 199
	};                                                                                                                 // 200
	FS_proto.readyState = FS_proto.INIT = 0;                                                                           // 201
	FS_proto.WRITING = 1;                                                                                              // 202
	FS_proto.DONE = 2;                                                                                                 // 203
                                                                                                                    // 204
	FS_proto.error =                                                                                                   // 205
	FS_proto.onwritestart =                                                                                            // 206
	FS_proto.onprogress =                                                                                              // 207
	FS_proto.onwrite =                                                                                                 // 208
	FS_proto.onabort =                                                                                                 // 209
	FS_proto.onerror =                                                                                                 // 210
	FS_proto.onwriteend =                                                                                              // 211
		null;                                                                                                             // 212
                                                                                                                    // 213
	view.addEventListener("unload", process_deletion_queue, false);                                                    // 214
	return saveAs;                                                                                                     // 215
}(self));                                                                                                           // 216
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/template.collectionFS_templates.js                                                         //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Template.__define__("_cfsQueueProgressBar",Package.handlebars.Handlebars.json_ast_to_func(["<progress value=\"",["{",[[0,"cfsQueueProgress"],[0,"collection"],{"fileId":[0,"fileId"]}]],"\" max=\"100\"",["!",[[0,"attributes"]]],">",["{",[[0,"cfsQueueProgress"],[0,"collection"],{"fileId":[0,"fileId"]}]],"%</progress>"]));
Template.__define__("_cfsDownloadButton",Package.handlebars.Handlebars.json_ast_to_func(["<button type=\"button\"",["!",[[0,"attributes"]]],">",["{",[[0,"content"]]],"</button>"]));
Template.__define__("_cfsFileInput",Package.handlebars.Handlebars.json_ast_to_func(["<button type=\"button\"",["!",[[0,"attributes"]]],">",["{",[[0,"content"]]],"</button>\n    <input type=\"file\"",["!",[[0,"attributes"]]]," />"]));
                                                                                                                    // 4
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_client.js                                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/* CollectionFS.js                                                                                                  // 1
 * A gridFS kind implementation.                                                                                    // 2
 * 2013-01-03                                                                                                       // 3
 *                                                                                                                  // 4
 * By Morten N.O. Henriksen, http://gi2.dk                                                                          // 5
 *                                                                                                                  // 6
 */                                                                                                                 // 7
                                                                                                                    // 8
// Transform api onto file objects                                                                                  // 9
_fileObject = function(doc, collection) {                                                                           // 10
  var self = this;                                                                                                  // 11
  self.collection = collection;                                                                                     // 12
  _.extend(self, doc);                                                                                              // 13
};                                                                                                                  // 14
                                                                                                                    // 15
// @export CollectionFS                                                                                             // 16
CollectionFS = function(name, options) {                                                                            // 17
	"use strict";                                                                                                      // 18
	var self = this;                                                                                                   // 19
	self._name = name;                                                                                                 // 20
	self._filter = null;                                                                                               // 21
  // Map transformation client api                                                                                  // 22
	self.files = new Meteor.Collection(self._name+'.files', {                                                          // 23
    transform: function(doc) {                                                                                      // 24
      return new _fileObject(doc, self);                                                                            // 25
    }                                                                                                               // 26
  });                                                                                                               // 27
	//TODO: Add change listener?                                                                                       // 28
	//self.chunks = new Meteor.Collection(self._name+'.chunks');                                                       // 29
	self.queue = new _queueCollectionFS(name);                                                                         // 30
	self._options = { autopublish: true };                                                                             // 31
	_.extend(self._options, options);                                                                                  // 32
                                                                                                                    // 33
    //events                                                                                                        // 34
	self._events = {                                                                                                   // 35
    'ready': function() {},                                                                                         // 36
    'invalid': function() {}, // function(CFSErrorType, fileRecord)                                                 // 37
    'progress': function() {}, // function(percentageInteger)                                                       // 38
    'start': function() {},                                                                                         // 39
    'stop': function() {},                                                                                          // 40
    'resume': function() {}                                                                                         // 41
  };                                                                                                                // 42
                                                                                                                    // 43
	//Auto subscribe                                                                                                   // 44
	if (self._options.autopublish){                                                                                    // 45
    Meteor.subscribe(self._name+'.files');                                                                          // 46
  }                                                                                                                 // 47
                                                                                                                    // 48
}; //EO collectionFS                                                                                                // 49
                                                                                                                    // 50
_queueCollectionFS = function(name) {                                                                               // 51
  "use strict";                                                                                                     // 52
	var self = this;                                                                                                   // 53
	self._name = name;                                                                                                 // 54
	self.fileDeps  = new Deps.Dependency();                                                                            // 55
  // TODO: Deps could be finetuned pr. single files?                                                                // 56
	self.connection = Meteor.connect(Meteor.default_connection._stream.rawUrl);                                        // 57
	self.spawns = 1;  //0 = we dont spawn into "threads",                                                              // 58
                    // 1..n = we spawn multiple "threads"                                                           // 59
	self.paused = false;                                                                                               // 60
};                                                                                                                  // 61
                                                                                                                    // 62
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_client.api.js                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
_.extend(CollectionFS.prototype, {                                                                                  // 3
	storeFile: function(file, options) {                                                                               // 4
		var self = this;                                                                                                  // 5
		var fileId = null;                                                                                                // 6
		var record = self.queue.makeGridFSFileRecord(file, options);                                                      // 7
    if (!self.fileIsAllowed(record)) {                                                                              // 8
      return null;                                                                                                  // 9
    }                                                                                                               // 10
		fileId = self.files.insert(record);                                                                               // 11
		if (!fileId) {                                                                                                    // 12
      return null;                                                                                                  // 13
    }                                                                                                               // 14
		//Put file in upload queue                                                                                        // 15
		self.queue.addFile(fileId, file);                                                                                 // 16
		return fileId;                                                                                                    // 17
	}, //EO storeFile                                                                                                  // 18
  storeFiles: function(files, metadata, callback) {                                                                 // 19
    var self = this, fileId, fileIds = [], file, tempMd;                                                            // 20
    if (files && files.length) {                                                                                    // 21
      for (var i = 0, ln = files.length; i < ln; i++) {                                                             // 22
        file = files[i];                                                                                            // 23
        if (metadata !== undefined && typeof metadata === 'function') {                                             // 24
          tempMd = metadata(file);                                                                                  // 25
        } else {                                                                                                    // 26
          tempMd = metadata;                                                                                        // 27
        }                                                                                                           // 28
        fileId = self.storeFile(file, tempMd);                                                                      // 29
        if (fileId) {                                                                                               // 30
          fileIds.push(fileId);                                                                                     // 31
        }                                                                                                           // 32
        if (callback !== undefined && typeof callback === 'function') {                                             // 33
          callback(file, fileId);                                                                                   // 34
        }                                                                                                           // 35
      }                                                                                                             // 36
    }                                                                                                               // 37
    return fileIds;                                                                                                 // 38
  }, //EO storeFiles                                                                                                // 39
	//callback(fileItem)                                                                                               // 40
	retrieveBlob: function(fileId, callback) {                                                                         // 41
		//console.log('retrieveBlob');                                                                                    // 42
		var self = this;                                                                                                  // 43
		var fileItem = self.queue._getItem(fileId);                                                                       // 44
		//if file blob in queue, then use the file instead of downloading...                                              // 45
		if (fileItem &&(fileItem.file||fileItem.blob)) {                                                                  // 46
			//if file if blob                                                                                                // 47
			callback(fileItem);                                                                                              // 48
		} else {                                                                                                          // 49
			var fileRecord = self.files.findOne({ _id: fileId});                                                             // 50
			//download into queue file blob                                                                                  // 51
			self.queue.getFile(fileRecord, callback);                                                                        // 52
		}                                                                                                                 // 53
		//return blob                                                                                                     // 54
	}, //EO retrieveBlob                                                                                               // 55
	retrieveFile: function(fileId, callback) {                                                                         // 56
		//check if found locally - then use directly                                                                      // 57
		//fetch from server, via methods call - dont want the chunks collection                                           // 58
	}, //EO retriveFile                                                                                                // 59
  acceptDropsOn: function(templateName, selector, metadata, callback) {                                             // 60
    var self = this, events = {};                                                                                   // 61
    // Prevent default drag and drop                                                                                // 62
    function noopHandler(evt) {                                                                                     // 63
      evt.stopPropagation();                                                                                        // 64
      evt.preventDefault();                                                                                         // 65
    }                                                                                                               // 66
                                                                                                                    // 67
    // Handle file dropped                                                                                          // 68
    function dropped(evt) {                                                                                         // 69
      noopHandler(evt);                                                                                             // 70
      self.storeFiles(evt.dataTransfer.files, metadata, callback);                                                  // 71
    }                                                                                                               // 72
                                                                                                                    // 73
    events['dragenter ' + selector] = noopHandler;                                                                  // 74
    events['dragexit ' + selector] = noopHandler;                                                                   // 75
    events['dragover ' + selector] = noopHandler;                                                                   // 76
    events['dragend ' + selector] = noopHandler;                                                                    // 77
    events['drop ' + selector] = dropped;                                                                           // 78
                                                                                                                    // 79
    Template[templateName].events(events);                                                                          // 80
  }                                                                                                                 // 81
}); //EO extend collection                                                                                          // 82
                                                                                                                    // 83
                                                                                                                    // 84
_.extend(_queueCollectionFS.prototype, {                                                                            // 85
                                                                                                                    // 86
	//////////////////////////////////////////////////////////////////////////////                                     // 87
	////////////////////////////// Getters ///////////////////////////////////////                                     // 88
	//////////////////////////////////////////////////////////////////////////////                                     // 89
                                                                                                                    // 90
	getItem: function(fileId) {                                                                                        // 91
		var self = this;                                                                                                  // 92
		self.fileDeps.depend();                                                                                           // 93
		return self._getItem(fileId);                                                                                     // 94
	}, //EO getItem                                                                                                    // 95
                                                                                                                    // 96
	//_getItem is private function, not reactive                                                                       // 97
	_getItem: function(fileId) {                                                                                       // 98
		var self = this;                                                                                                  // 99
		return self.queue[fileId];                                                                                        // 100
	}, //EO _getItem                                                                                                   // 101
                                                                                                                    // 102
  //_getProgress is private function, not reactive                                                                  // 103
  _getProgress: function(fileId, onlyBuffer) {                                                                      // 104
    var self = this;                                                                                                // 105
    var fileItem = self._getItem(fileId);                                                                           // 106
    if (!fileItem) {                                                                                                // 107
      return false;                                                                                                 // 108
    }                                                                                                               // 109
                                                                                                                    // 110
    if (fileItem.complete) {                                                                                        // 111
      return 100;                                                                                                   // 112
    }                                                                                                               // 113
                                                                                                                    // 114
    var pointerChunk = (onlyBuffer) ?                                                                               // 115
            fileItem.currentChunk : fileItem.currentChunkServer; //TODO:                                            // 116
                                                                                                                    // 117
    if (fileItem) {                                                                                                 // 118
      return Math.round(pointerChunk / fileItem.countChunks * 100);                                                 // 119
    } else {                                                                                                        // 120
      return 0;                                                                                                     // 121
    }                                                                                                               // 122
  }, //EO _getProgress                                                                                              // 123
                                                                                                                    // 124
	progress: function(fileId, onlyBuffer) {                                                                           // 125
		var self = this;                                                                                                  // 126
    self.fileDeps.depend();                                                                                         // 127
    return self._getProgress(fileId, onlyBuffer);                                                                   // 128
	}, //EO progress                                                                                                   // 129
                                                                                                                    // 130
	isComplete: function(fileId) {                                                                                     // 131
    var self = this;                                                                                                // 132
    self.fileDeps.depend();                                                                                         // 133
    var fileItem = self._getItem(fileId);                                                                           // 134
    if (!fileItem) {                                                                                                // 135
      return true;                                                                                                  // 136
    }                                                                                                               // 137
    return fileItem.complete;                                                                                       // 138
	}, //EO isComplete                                                                                                 // 139
                                                                                                                    // 140
  isUploading: function(fileId) {                                                                                   // 141
    var self = this;                                                                                                // 142
    self.fileDeps.depend();                                                                                         // 143
    var fileItem = self._getItem(fileId);                                                                           // 144
    if (!fileItem || fileItem.download) {                                                                           // 145
      return false;                                                                                                 // 146
    }                                                                                                               // 147
    var progress = self._getProgress(fileId);                                                                       // 148
    return (progress && progress > 0 && progress < 100);                                                            // 149
  }, //EO isUploading                                                                                               // 150
                                                                                                                    // 151
	isDownloading: function(fileId) {                                                                                  // 152
		var self = this;                                                                                                  // 153
    self.fileDeps.depend();                                                                                         // 154
		var fileItem = self._getItem(fileId);                                                                             // 155
		if (!fileItem || !fileItem.download) {                                                                            // 156
      return false;                                                                                                 // 157
    }                                                                                                               // 158
    var progress = self._getProgress(fileId);                                                                       // 159
    return (progress && progress > 0 && progress < 100);                                                            // 160
	}, //EO isDownloading                                                                                              // 161
                                                                                                                    // 162
	isDownloaded: function(fileId) {                                                                                   // 163
		var self = this;                                                                                                  // 164
		self.fileDeps.depend();                                                                                           // 165
		var fileItem = self._getItem(fileId);                                                                             // 166
		if (fileItem.file) {                                                                                              // 167
      return true;                                                                                                  // 168
    }                                                                                                               // 169
		if (fileItem.download) {                                                                                          // 170
			return (fileItem.currentChunk === fileItem.countChunks-1);                                                       // 171
		}                                                                                                                 // 172
		return false;                                                                                                     // 173
	}, //EO isDownloaded                                                                                               // 174
                                                                                                                    // 175
	isPaused: function() {                                                                                             // 176
		var self = this;                                                                                                  // 177
		self.fileDeps.depend();                                                                                           // 178
		return self.paused;                                                                                               // 179
	}, //EO isPaused                                                                                                   // 180
                                                                                                                    // 181
                                                                                                                    // 182
	//////////////////////////////////////////////////////////////////////////////                                     // 183
	/////////////////////////////// Queue ////////////////////////////////////////                                     // 184
	//////////////////////////////////////////////////////////////////////////////                                     // 185
	//Bind to hot push code to resume after server reboot                                                              // 186
	resume: function() {                                                                                               // 187
		var self = this;                                                                                                  // 188
		self.paused = false;                                                                                              // 189
		self.fileDeps.changed();                                                                                          // 190
		//console.log('paused:'+self.paused);                                                                             // 191
		for (var fileId in self.queue) {                                                                                  // 192
			var fileItem = self._getItem(fileId);                                                                            // 193
			if (fileItem.download) {                                                                                         // 194
				//Spawn loaders                                                                                                 // 195
				if (!self.spawns){                                                                                              // 196
          self.downloadChunk(fileId);                                                                               // 197
        } else {                                                                                                    // 198
					for (var i = 0; i < self.spawns; i++) {                                                                        // 199
            setTimeout(function() { self.downloadChunk(fileId); });                                                 // 200
          }                                                                                                         // 201
        }                                                                                                           // 202
			} else {                                                                                                         // 203
				//Spawn loaders                                                                                                 // 204
				if (!self.spawns) {                                                                                             // 205
					self.getDataChunk(fileId);                                                                                     // 206
				} else {                                                                                                        // 207
          for (var i = 0; i < self.spawns; i++) {                                                                   // 208
            setTimeout(function() { self.getDataChunk(fileId); });                                                  // 209
          }                                                                                                         // 210
        }                                                                                                           // 211
			}                                                                                                                // 212
		}                                                                                                                 // 213
	}, //EO resume                                                                                                     // 214
                                                                                                                    // 215
	pause: function() {                                                                                                // 216
		this.paused = true;                                                                                               // 217
		this.fileDeps.changed();                                                                                          // 218
	},                                                                                                                 // 219
                                                                                                                    // 220
	resumeFile: function(fileRecord, file) {                                                                           // 221
		var self = this;                                                                                                  // 222
		var testFileRecord = self.makeGridFSFileRecord(file);                                                             // 223
		if (self.compareFile(fileRecord, testFileRecord)) {                                                               // 224
			self.addFile(fileRecord._id, file, fileRecord.currentChunk);                                                     // 225
			return true;                                                                                                     // 226
		}                                                                                                                 // 227
		//console.log('resumeFile - files dont match');                                                                   // 228
		return false; //Didnt compare - cant resumeFile                                                                   // 229
	}, //EO function                                                                                                   // 230
	//////////////////////////////////////////////////////////////////////////////                                     // 231
	/////////////////////////////// DOWNLOAD  ////////////////////////////////////                                     // 232
	//////////////////////////////////////////////////////////////////////////////                                     // 233
	addDataChunk: function(fileId, chunckNumber, data) {                                                               // 234
		var self = this;                                                                                                  // 235
		var fileItem = self._getItem(fileId);                                                                             // 236
                                                                                                                    // 237
    var carry = [];                                                                                                 // 238
    for(var i = 0; i < data.length; i++) {                                                                          // 239
      carry.push(data.charCodeAt(i));                                                                               // 240
    }                                                                                                               // 241
                                                                                                                    // 242
		self.queue[fileId].queueChunks[chunckNumber] = new Uint8Array(carry);                                             // 243
    //chunkBlob; TODO: use EJSON.binary()                                                                           // 244
	},                                                                                                                 // 245
                                                                                                                    // 246
	unionChunkBlobs: function(fileId) {                                                                                // 247
		var self = this;                                                                                                  // 248
		var fileItem = self._getItem(fileId);                                                                             // 249
                                                                                                                    // 250
		if (fileItem.queueChunks.length === fileItem.countChunks) {                                                       // 251
      //Last worker make chunks into blob                                                                           // 252
			self.queue[fileId].blob = new Blob(fileItem.queueChunks,                                                         // 253
              { type: fileItem.contentType });                                                                      // 254
			var myCallback = fileItem.callback;                                                                              // 255
			if (fileItem.callback) {                                                                                         // 256
				fileItem.callback = null; //Only do this once                                                                   // 257
				myCallback(self._getItem(fileId));                                                                              // 258
			}                                                                                                                // 259
			//Now completed, trigger update                                                                                  // 260
			self.fileDeps.changed();                                                                                         // 261
		}                                                                                                                 // 262
	},                                                                                                                 // 263
                                                                                                                    // 264
	downloadChunk: function(fileId, optChunkNumber) {                                                                  // 265
		var self = this;                                                                                                  // 266
		var fileItem = self._getItem(fileId);                                                                             // 267
		var myChunkNumber = optChunkNumber || self.nextChunk(fileId);                                                     // 268
		if (myChunkNumber === false) {                                                                                    // 269
			return false;                                                                                                    // 270
    }                                                                                                               // 271
                                                                                                                    // 272
		self.lastCountDownload++;                                                                                         // 273
		if (self.lastTimeDownload) {                                                                                      // 274
			if (self.lastCountDownload === 10) {                                                                             // 275
				self.lastCountDownload = 0;                                                                                     // 276
				var bitPrSecDownload = (8 * self.chunkSize * 10) /                                                              // 277
                ((Date.now()-self.lastTimeDownload ) / 100);                                                        // 278
        var oldBitPrSecDownload = (Session.get('bitPrSecDownload'))?                                                // 279
                Session.get('bitPrSecDownload'):bitPrSecDownload;                                                   // 280
				Session.set('bitPrSecDownload',                                                                                 // 281
                Math.round( (oldBitPrSecDownload*9 + bitPrSecDownload)/10) );                                       // 282
				self.lastTimeDownload = Date.now();                                                                             // 283
			}                                                                                                                // 284
		} else {                                                                                                          // 285
			self.lastTimeDownload = Date.now();                                                                              // 286
		}                                                                                                                 // 287
                                                                                                                    // 288
		self.connection.apply('loadChunck'+fileItem.collectionName, [                                                     // 289
			fileId = fileId,                                                                                                 // 290
			chunkNumber = myChunkNumber,                                                                                     // 291
			countChunks = fileItem.countChunks                                                                               // 292
		],[                                                                                                               // 293
			wait = true                                                                                                      // 294
		],                                                                                                                // 295
			function(error, result) {                                                                                        // 296
				//Callback                                                                                                      // 297
				if (result.chunkId) {                                                                                           // 298
                                                                                                                    // 299
					self.queue[fileId].currentChunkServer = result.currentChunk+1;                                                 // 300
					self.addDataChunk(fileId, myChunkNumber, result.data);                                                         // 301
					var next = self.nextChunk(fileId);                                                                             // 302
					//console.log('Got: '+myChunkNumber+' next:'+next);                                                            // 303
					if (next) {                                                                                                    // 304
						self.downloadChunk(fileId, next);                                                                             // 305
					} else {                                                                                                       // 306
						if (self.queue[fileId].queueChunks.length ===                                                                 // 307
                    self.queue[fileId].countChunks) {                                                               // 308
							self.unionChunkBlobs(fileId);                                                                                // 309
						} /* else {                                                                                                   // 310
							//console.log('Waiting for last arrivals');                                                                  // 311
						}*/                                                                                                           // 312
						//update and notify listenters                                                                                // 313
                                                                                                                    // 314
						/*if (self.queue[fileId].currentChunk % 1 == 0) {                                                             // 315
							self.fileDeps.changed();                                                                                     // 316
						}*/                                                                                                           // 317
					}                                                                                                              // 318
				}                                                                                                               // 319
			}//EO func                                                                                                       // 320
		);//EO Meteor.apply                                                                                               // 321
	}, //EO                                                                                                            // 322
                                                                                                                    // 323
	// getFile callback(fileItem)                                                                                      // 324
	getFile: function(fileRecord, callback, currentChunk) {                                                            // 325
		var self = this;                                                                                                  // 326
		self.queue[fileRecord._id] = {                                                                                    // 327
			_id: fileRecord._id,                                                                                             // 328
			download: true,                                                                                                  // 329
			complete: false,                                                                                                 // 330
			file: null,                                                                                                      // 331
			blob: null,                                                                                                      // 332
			queueChunks: [],                                                                                                 // 333
			collectionName:self._name,                                                                                       // 334
      filename: fileRecord.filename,                                                                                // 335
			connection:self.connection,                                                                                      // 336
			contentType: fileRecord.contentType,                                                                             // 337
			currentChunkServer: (currentChunk)?currentChunk:0,                                                               // 338
			currentChunk: (currentChunk)?currentChunk:0,                                                                     // 339
      //current loaded chunk of countChunks-1                                                                       // 340
      countChunks: fileRecord.countChunks,                                                                          // 341
			callback: callback,                                                                                              // 342
//				len: fileRecord['len']                                                                                        // 343
			length: ''+fileRecord['length']  //When fix in meteor dont add ''+                                               // 344
                                                                                                                    // 345
		};                                                                                                                // 346
                                                                                                                    // 347
		//Added download request to the queue                                                                             // 348
		self.fileDeps.changed();                                                                                          // 349
                                                                                                                    // 350
		//Spawn loaders                                                                                                   // 351
		if (!self.spawns) {                                                                                               // 352
			self.downloadChunk(fileRecord._id);                                                                              // 353
		} else {                                                                                                          // 354
			for (var i = 0; i < self.spawns; i++) {                                                                          // 355
        setTimeout(function() { self.downloadChunk(fileRecord._id); });                                             // 356
      }                                                                                                             // 357
    }                                                                                                               // 358
	}, //EO                                                                                                            // 359
	//////////////////////////////////////////////////////////////////////////////                                     // 360
	//////////////////////////////// UPLOAD //////////////////////////////////////                                     // 361
	//////////////////////////////////////////////////////////////////////////////                                     // 362
                                                                                                                    // 363
	addFile: function(fileId, file, currentChunk) {                                                                    // 364
		var self = this;                                                                                                  // 365
		var countChunks = Math.ceil(file.size / self.chunkSize);                                                          // 366
		self.queue[fileId] = {                                                                                            // 367
			_id: fileId,                                                                                                     // 368
			download: false,                                                                                                 // 369
			complete: false,                                                                                                 // 370
			file: file,                                                                                                      // 371
      filename: file.name,                                                                                          // 372
			collectionName:self._name,                                                                                       // 373
			connection:self.connection,                                                                                      // 374
			currentChunkServer: (currentChunk)?currentChunk:0,                                                               // 375
			currentChunk: (currentChunk)?currentChunk:0,                                                                     // 376
      //current loaded chunk of countChunks-1                                                                       // 377
			countChunks: countChunks                                                                                         // 378
			//filereader: new FileReader(),                                                                                  // 379
		};                                                                                                                // 380
		//Added upload request to the queue                                                                               // 381
		self.fileDeps.changed();                                                                                          // 382
                                                                                                                    // 383
		//Spawn loaders                                                                                                   // 384
		if (!self.spawns) {                                                                                               // 385
			self.getDataChunk(fileId, 0);                                                                                    // 386
		} else {                                                                                                          // 387
			for (var i = 0; i < self.spawns; i++) {                                                                          // 388
				setTimeout(function() { self.getDataChunk(fileId); });                                                          // 389
      }                                                                                                             // 390
    }                                                                                                               // 391
	}, //EO addFile                                                                                                    // 392
                                                                                                                    // 393
	getDataChunk: function(fileId, optChunkNumber) {                                                                   // 394
		var self = this;                                                                                                  // 395
		var myChunkNumber = optChunkNumber || self.nextChunk(fileId);                                                     // 396
		if (myChunkNumber === false) {                                                                                    // 397
			return false;                                                                                                    // 398
    }                                                                                                               // 399
		var f = self.queue[fileId].file;                                                                                  // 400
		var myreader = new FileReader();                                                                                  // 401
		var start = myChunkNumber * self.chunkSize;                                                                       // 402
		//make sure not to exeed boundaries                                                                               // 403
		var stop = Math.min(start + self.chunkSize, f.size);                                                              // 404
		var slice = f.slice||f.webkitSlice||f.mozSlice;                                                                   // 405
		var blob = slice.call(f, start, stop, f.contentType);                                                             // 406
                                                                                                                    // 407
		myreader.onloadend = function(evt) {                                                                              // 408
			if (evt.target.readyState === FileReader.DONE) {                                                                 // 409
				self.uploadChunk(fileId, myChunkNumber, evt.target.result);                                                     // 410
			}                                                                                                                // 411
		};                                                                                                                // 412
                                                                                                                    // 413
		if (blob) {                                                                                                       // 414
			myreader.readAsBinaryString(blob);                                                                               // 415
		} else {                                                                                                          // 416
			throw new Error('Slice function not supported, fileId:'+fileId);                                                 // 417
		}                                                                                                                 // 418
	}, //EO get data chunk                                                                                             // 419
                                                                                                                    // 420
	uploadChunk: function(fileId, chunkNumber, data) {                                                                 // 421
		var self = this;                                                                                                  // 422
		var fileItem = self._getItem(fileId);                                                                             // 423
                                                                                                                    // 424
		self.lastCountUpload++;                                                                                           // 425
		if (self.lastTimeUpload) {                                                                                        // 426
			if (self.lastCountUpload === 10) {                                                                               // 427
				self.lastCountUpload = 0;                                                                                       // 428
				var bitPrSecUpload = (8 * self.chunkSize * 10) /                                                                // 429
                ((Date.now()-self.lastTimeUpload ) / 100);                                                          // 430
				var oldBitPrSecUpload = (Session.get('bitPrSecUpload'))?                                                        // 431
                Session.get('bitPrSecUpload'):bitPrSecUpload;                                                       // 432
				Session.set('bitPrSecUpload',                                                                                   // 433
                Math.round( (oldBitPrSecUpload*9 + bitPrSecUpload)/10) );                                           // 434
				self.lastTimeUpload = Date.now();                                                                               // 435
			}                                                                                                                // 436
		} else {                                                                                                          // 437
			self.lastTimeUpload = Date.now();                                                                                // 438
		}                                                                                                                 // 439
                                                                                                                    // 440
		self.connection.apply('saveChunck'+fileItem.collectionName, [                                                     // 441
			fileId = fileId,                                                                                                 // 442
			currentChunk = chunkNumber,                                                                                      // 443
			countChunks = fileItem.countChunks,                                                                              // 444
			data = data                                                                                                      // 445
		],[                                                                                                               // 446
			wait = true                                                                                                      // 447
		], function(error, result) {                                                                                      // 448
				//Callback                                                                                                      // 449
				if (error) {                                                                                                    // 450
          console.log(error);                                                                                       // 451
        }                                                                                                           // 452
                                                                                                                    // 453
				if (result.chunkId) {                                                                                           // 454
					self.queue[fileId].currentChunkServer = result.currentChunk;                                                   // 455
                                                                                                                    // 456
					//TODO: Really, should the next function rule? or the                                                          // 457
          // result.currentChunk?                                                                                   // 458
					//The result could be async? multiple users                                                                    // 459
					//Use in >saveChunk< function:                                                                                 // 460
					//	updating files $inc: { currentChunk: 0 } until == countChunks                                               // 461
					//	if not missing any chunks then complete else request client to                                              // 462
          // upload by returning missing chunk number?                                                              // 463
					//                                                                                                             // 464
					// var next = result.currentChunck;  //Chunck to download.. if not the                                         // 465
          // save func gotta test fs.chunks index                                                                   // 466
                                                                                                                    // 467
					var next = self.nextChunk(result.fileId); //or let server decide                                               // 468
					//!result.complete &&                                                                                          // 469
					if (!result.complete) {                                                                                        // 470
						self.getDataChunk(result.fileId, next);                                                                       // 471
					} /*else {                                                                                                     // 472
						//Client or server check chunks..                                                                             // 473
                                                                                                                    // 474
					}*/                                                                                                            // 475
				}                                                                                                               // 476
			}                                                                                                                // 477
                                                                                                                    // 478
		);                                                                                                                // 479
	}, //uploadNextChunk                                                                                               // 480
	//nextChunk returns next chunkNumber                                                                               // 481
	nextChunk: function(fileId) {                                                                                      // 482
		var self = this;                                                                                                  // 483
		if (self.isPaused()){                                                                                             // 484
      return false;                                                                                                 // 485
    }                                                                                                               // 486
    //self.queue[fileId].countChunks = 1; //Uncomment for debugging                                                 // 487
		self.queue[fileId].complete =                                                                                     // 488
          (self.queue[fileId].currentChunk === self.queue[fileId].countChunks);                                     // 489
		//  Queue progressed                                                                                              // 490
    //	if (self.queue[fileId].currentChunk % 1 == 0 ||                                                              // 491
    //          self.queue[fileId].complete)                                                                        // 492
    self.fileDeps.changed();                                                                                        // 493
		if (self.queue[fileId].complete) {                                                                                // 494
			//done                                                                                                           // 495
			//XXX: Spawn complete event?                                                                                     // 496
			return false;                                                                                                    // 497
		} else {                                                                                                          // 498
			if (!self.queue[fileId].complete) { self.queue[fileId].currentChunk++; }                                         // 499
			//XXX: Spawn progress event?                                                                                     // 500
			return self.queue[fileId].currentChunk-1;                                                                        // 501
		}                                                                                                                 // 502
	} //EO nextChunk                                                                                                   // 503
                                                                                                                    // 504
                                                                                                                    // 505
}); //EO                                                                                                            // 506
                                                                                                                    // 507
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_client.api.fileobject.js                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
                                                                                                                    // 3
/*                                                                                                                  // 4
  CLIENT API                                                                                                        // 5
                                                                                                                    // 6
  The clientFileObject is equal to the fileRecord + client-side api                                                 // 7
  This pattern will allow easier manipulation of files since we now pass                                            // 8
  file objects with methods attatched.                                                                              // 9
  In many cases we are only passed content objects with no reference to the                                         // 10
  collection attached - This way we actually know were the data belongs and                                         // 11
  makes operations much easier.                                                                                     // 12
                                                                                                                    // 13
  Eg.                                                                                                               // 14
                                                                                                                    // 15
  Template.test.events({                                                                                            // 16
    'click .file': function(event, temp) {                                                                          // 17
      this._id...                                                                                                   // 18
      this.toDataUrl()                                                                                              // 19
      this.toBlob()                                                                                                 // 20
      this.remove()                                                                                                 // 21
      this.getExtension()                                                                                           // 22
      this.getUrl()                                                                                                 // 23
    }                                                                                                               // 24
  });                                                                                                               // 25
                                                                                                                    // 26
*/                                                                                                                  // 27
_.extend(_fileObject.prototype, {                                                                                   // 28
  // Expect self to have the properties of fileRecord                                                               // 29
  // Added is self.collection for access to the collection the file belongs                                         // 30
                                                                                                                    // 31
  // TODO: Add client file object api                                                                               // 32
  toDataUrl: function(callback) {                                                                                   // 33
    if (typeof callback !== 'function') {                                                                           // 34
      throw new Error("toDataUrl requires function as callback");                                                   // 35
    }                                                                                                               // 36
                                                                                                                    // 37
    var data;                                                                                                       // 38
                                                                                                                    // 39
    // TODO: Load file into data as 'base64 -> url'                                                                 // 40
                                                                                                                    // 41
    callback(data);                                                                                                 // 42
  },                                                                                                                // 43
  toBlob: function(callback) {                                                                                      // 44
    if (typeof callback !== 'function') {                                                                           // 45
      throw new Error("toBlob requires function as callback");                                                      // 46
    }                                                                                                               // 47
                                                                                                                    // 48
    var data;                                                                                                       // 49
                                                                                                                    // 50
    // TODO: Load file into data as 'blob'                                                                          // 51
                                                                                                                    // 52
    callback(data);                                                                                                 // 53
  }                                                                                                                 // 54
});                                                                                                                 // 55
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_handlebars.js                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
if (typeof Handlebars !== 'undefined') {                                                                            // 3
  //Usage:                                                                                                          // 4
  //{{cfsFile "Collection" fileId}}                                                                                 // 5
  Handlebars.registerHelper('cfsFile', function(collection, fileId) {                                               // 6
    return window[collection].findOne(fileId);                                                                      // 7
  });                                                                                                               // 8
                                                                                                                    // 9
  //Usage:                                                                                                          // 10
  //{{cfsFiles "Collection"}}                                                                                       // 11
  Handlebars.registerHelper('cfsFiles', function(collection) {                                                      // 12
    return window[collection].find();                                                                               // 13
  });                                                                                                               // 14
                                                                                                                    // 15
  //Usage:                                                                                                          // 16
  //{{#if cfsHasFiles "Collection"}}                                                                                // 17
  Handlebars.registerHelper('cfsHasFiles', function(collection) {                                                   // 18
    return window[collection].find().count() > 0;                                                                   // 19
  });                                                                                                               // 20
                                                                                                                    // 21
  //Usage:                                                                                                          // 22
  //(1) {{cfsIsUploading "Collection"}} (with file as current context)                                              // 23
  //(2) {{cfsIsUploading "Collection" file=file}}                                                                   // 24
  //(3) {{cfsIsUploading "Collection" fileId=fileId}}                                                               // 25
  Handlebars.registerHelper('cfsIsUploading', function(collection, opts) {                                          // 26
    var fileId, hash, CFS;                                                                                          // 27
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 28
    if (hash.file) {                                                                                                // 29
      fileId = hash.file._id;                                                                                       // 30
    } else {                                                                                                        // 31
      fileId = hash.fileId || this._id;                                                                             // 32
    }                                                                                                               // 33
    if (!fileId) {                                                                                                  // 34
      return false;                                                                                                 // 35
    }                                                                                                               // 36
    CFS = window[collection];                                                                                       // 37
    if (!CFS || !CFS.queue) {                                                                                       // 38
      return false;                                                                                                 // 39
    }                                                                                                               // 40
    return CFS.queue.isUploading(fileId);                                                                           // 41
  });                                                                                                               // 42
                                                                                                                    // 43
  //Usage:                                                                                                          // 44
  //(1) {{cfsIsDownloading "Collection"}} (with file as current context)                                            // 45
  //(2) {{cfsIsDownloading "Collection" file=file}}                                                                 // 46
  //(3) {{cfsIsDownloading "Collection" fileId=fileId}}                                                             // 47
  Handlebars.registerHelper('cfsIsDownloading', function(collection, opts) {                                        // 48
    var fileId, hash, CFS;                                                                                          // 49
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 50
    if (hash.file) {                                                                                                // 51
      fileId = hash.file._id;                                                                                       // 52
    } else {                                                                                                        // 53
      fileId = hash.fileId || this._id;                                                                             // 54
    }                                                                                                               // 55
    if (!fileId) {                                                                                                  // 56
      return false;                                                                                                 // 57
    }                                                                                                               // 58
    CFS = window[collection];                                                                                       // 59
    if (!CFS || !CFS.queue) {                                                                                       // 60
      return false;                                                                                                 // 61
    }                                                                                                               // 62
    return CFS.queue.isDownloading(fileId);                                                                         // 63
  });                                                                                                               // 64
                                                                                                                    // 65
  //Usage:                                                                                                          // 66
  //(1) {{cfsIsDownloaded "Collection"}} (with file as current context)                                             // 67
  //(2) {{cfsIsDownloaded "Collection" file=file}}                                                                  // 68
  //(3) {{cfsIsDownloaded "Collection" fileId=fileId}}                                                              // 69
  Handlebars.registerHelper('cfsIsDownloaded', function(collection, opts) {                                         // 70
    var fileId, hash, CFS;                                                                                          // 71
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 72
    if (hash.file) {                                                                                                // 73
      fileId = hash.file._id;                                                                                       // 74
    } else {                                                                                                        // 75
      fileId = hash.fileId || this._id;                                                                             // 76
    }                                                                                                               // 77
    if (!fileId) {                                                                                                  // 78
      return false;                                                                                                 // 79
    }                                                                                                               // 80
    CFS = window[collection];                                                                                       // 81
    if (!CFS || !CFS.queue) {                                                                                       // 82
      return false;                                                                                                 // 83
    }                                                                                                               // 84
    return CFS.queue.isDownloaded(fileId);                                                                          // 85
  });                                                                                                               // 86
                                                                                                                    // 87
  //Usage:                                                                                                          // 88
  //(1) {{cfsIsComplete "Collection"}} (with file as current context)                                               // 89
  //(2) {{cfsIsComplete "Collection" file=file}}                                                                    // 90
  //(3) {{cfsIsComplete "Collection" fileId=fileId}}                                                                // 91
  Handlebars.registerHelper('cfsIsComplete', function(collection, opts) {                                           // 92
    var fileId, hash, CFS;                                                                                          // 93
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 94
    if (hash.file) {                                                                                                // 95
      fileId = hash.file._id;                                                                                       // 96
    } else {                                                                                                        // 97
      fileId = hash.fileId || this._id;                                                                             // 98
    }                                                                                                               // 99
    if (!fileId) {                                                                                                  // 100
      return false;                                                                                                 // 101
    }                                                                                                               // 102
    CFS = window[collection];                                                                                       // 103
    if (!CFS || !CFS.queue) {                                                                                       // 104
      return false;                                                                                                 // 105
    }                                                                                                               // 106
    return CFS.queue.isComplete(fileId);                                                                            // 107
  });                                                                                                               // 108
                                                                                                                    // 109
  //Usage:                                                                                                          // 110
  //(1) {{cfsQueueProgress "Collection"}} (with file as current context)                                            // 111
  //(2) {{cfsQueueProgress "Collection" file=file}}                                                                 // 112
  //(3) {{cfsQueueProgress "Collection" fileId=fileId}}                                                             // 113
  Handlebars.registerHelper('cfsQueueProgress', function(collection, opts) {                                        // 114
    var fileId, hash, CFS;                                                                                          // 115
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 116
    if (hash.file) {                                                                                                // 117
      fileId = hash.file._id;                                                                                       // 118
    } else {                                                                                                        // 119
      fileId = hash.fileId || this._id;                                                                             // 120
    }                                                                                                               // 121
    if (!fileId) {                                                                                                  // 122
      return false;                                                                                                 // 123
    }                                                                                                               // 124
    CFS = window[collection];                                                                                       // 125
    if (!CFS || !CFS.queue) {                                                                                       // 126
      return false;                                                                                                 // 127
    }                                                                                                               // 128
    return CFS.queue.progress(fileId);                                                                              // 129
  });                                                                                                               // 130
                                                                                                                    // 131
  //Usage:                                                                                                          // 132
  //(1) {{cfsQueueProgressBar "Collection"}} (with file as current context)                                         // 133
  //(2) {{cfsQueueProgressBar "Collection" file=file}}                                                              // 134
  //(3) {{cfsQueueProgressBar "Collection" fileId=fileId}}                                                          // 135
  //Supported Options: id, class                                                                                    // 136
  Handlebars.registerHelper('cfsQueueProgressBar', function(collection, opts) {                                     // 137
    var fileId, hash;                                                                                               // 138
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 139
    if (hash.file) {                                                                                                // 140
      fileId = hash.file._id;                                                                                       // 141
    } else {                                                                                                        // 142
      fileId = hash.fileId || this._id;                                                                             // 143
    }                                                                                                               // 144
    if (!fileId) {                                                                                                  // 145
      return false;                                                                                                 // 146
    }                                                                                                               // 147
    return new Handlebars.SafeString(Template._cfsQueueProgressBar({                                                // 148
      collection: collection,                                                                                       // 149
      fileId: fileId,                                                                                               // 150
      attributes: (hash.id ? ' id="' + hash.id + '"' : '') + (hash.class ?                                          // 151
              ' class="' + hash.class + '"' : '')                                                                   // 152
    }));                                                                                                            // 153
  });                                                                                                               // 154
                                                                                                                    // 155
  //Usage:                                                                                                          // 156
  //{{cfsIsPaused "Collection"}}                                                                                    // 157
  Handlebars.registerHelper('cfsIsPaused', function(collection) {                                                   // 158
    var CFS = window[collection];                                                                                   // 159
    if (!CFS || !CFS.queue) {                                                                                       // 160
      return false;                                                                                                 // 161
    }                                                                                                               // 162
    return CFS.queue.isPaused();                                                                                    // 163
  });                                                                                                               // 164
                                                                                                                    // 165
  //Usage (Is current user the owner?):                                                                             // 166
  //(1) {{cfsIsOwner}} (with file as current context)                                                               // 167
  //(2) {{cfsIsOwner file=file}}                                                                                    // 168
  //(3) {{cfsIsOwner fileId=fileId collection="Collection"}}                                                        // 169
  //Usage (Is user with userId the owner?):                                                                         // 170
  //(1) {{cfsIsOwner userId=userId}} (with file as current context)                                                 // 171
  //(2) {{cfsIsOwner file=file userId=userId}}                                                                      // 172
  //(3) {{cfsIsOwner fileId=fileId collection="Collection" userId=userId}}                                          // 173
  Handlebars.registerHelper('cfsIsOwner', function(opts) {                                                          // 174
    var file, hash, userId;                                                                                         // 175
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 176
    userId = hash.userId || Meteor.userId();                                                                        // 177
    if (hash.fileId && hash.collection) {                                                                           // 178
      file = window[hash.collection].findOne(hash.fileId);                                                          // 179
    }                                                                                                               // 180
    if (!file) {                                                                                                    // 181
      file = hash.file || this;                                                                                     // 182
    }                                                                                                               // 183
    if (!file) {                                                                                                    // 184
      return false;                                                                                                 // 185
    }                                                                                                               // 186
    return (file.owner === userId);                                                                                 // 187
  });                                                                                                               // 188
                                                                                                                    // 189
  //Usage (default format string):                                                                                  // 190
  //(1) {{cfsFormattedSize}} (with file as current context)                                                         // 191
  //(2) {{cfsFormattedSize file=file}}                                                                              // 192
  //(3) {{cfsFormattedSize fileId=fileId collection="Collection"}}                                                  // 193
  //Usage (any format string supported by numeral.format):                                                          // 194
  //(1) {{cfsFormattedSize formatString=formatString}}                                                              // 195
  //        (with file as current context)                                                                          // 196
  //(2) {{cfsFormattedSize file=file formatString=formatString}}                                                    // 197
  //(3) {{cfsFormattedSize fileId=fileId collection="Collection"                                                    // 198
  //        formatString=formatString}}                                                                             // 199
  Handlebars.registerHelper('cfsFormattedSize', function(opts) {                                                    // 200
    var file, hash, formatString;                                                                                   // 201
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 202
    if (hash.fileId && hash.collection) {                                                                           // 203
      file = window[hash.collection].findOne(hash.fileId);                                                          // 204
    }                                                                                                               // 205
    if (!file) {                                                                                                    // 206
      file = hash.file || this;                                                                                     // 207
    }                                                                                                               // 208
    if (!file) {                                                                                                    // 209
      return "Unknown";                                                                                             // 210
    }                                                                                                               // 211
    formatString = hash.formatString || '0.00 b';                                                                   // 212
    return numeral(file.length).format(formatString);                                                               // 213
  });                                                                                                               // 214
                                                                                                                    // 215
  //Usage:                                                                                                          // 216
  //(1) {{cfsFileHandlers}} (with file as current context)                                                          // 217
  //(2) {{cfsFileHandlers file=file}}                                                                               // 218
  //(3) {{cfsFileHandlers fileId=fileId collection="Collection"}}                                                   // 219
  Handlebars.registerHelper('cfsFileHandlers', function(opts) {                                                     // 220
    var file, hash, fh, fId, fileHandlers = [];                                                                     // 221
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 222
    if (hash.fileId && hash.collection) {                                                                           // 223
      file = window[hash.collection].findOne(hash.fileId);                                                          // 224
    }                                                                                                               // 225
    if (!file) {                                                                                                    // 226
      file = hash.file || this;                                                                                     // 227
    }                                                                                                               // 228
    if (!file || !file.fileHandler) {                                                                               // 229
      return fileHandlers;                                                                                          // 230
    }                                                                                                               // 231
    // TODO: more safe iteration                                                                                    // 232
    for (fId in file.fileHandler) {                                                                                 // 233
      fileHandlers.push(fId);                                                                                       // 234
    }                                                                                                               // 235
    return fileHandlers;                                                                                            // 236
  });                                                                                                               // 237
                                                                                                                    // 238
  //Usage:                                                                                                          // 239
  //(1) {{cfsFileUrl "defaultHandler"}} (with file as current context)                                              // 240
  //(2) {{cfsFileUrl "defaultHandler" file=file}}                                                                   // 241
  //(3) {{cfsFileUrl "defaultHandler" fileId=fileId collection="Collection"}}                                       // 242
  Handlebars.registerHelper('cfsFileUrl', function(fileHandler, opts) {                                             // 243
    var file, hash, fh;                                                                                             // 244
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 245
    if (hash.fileId && hash.collection) {                                                                           // 246
      file = window[hash.collection].findOne(hash.fileId);                                                          // 247
    }                                                                                                               // 248
    if (!file) {                                                                                                    // 249
      file = hash.file || this;                                                                                     // 250
    }                                                                                                               // 251
    if (!file || !file.fileHandler) {                                                                               // 252
      return "";                                                                                                    // 253
    }                                                                                                               // 254
    fh = file.fileHandler[fileHandler];                                                                             // 255
    if (!fh) {                                                                                                      // 256
      return "";                                                                                                    // 257
    }                                                                                                               // 258
    return fh.url;                                                                                                  // 259
  });                                                                                                               // 260
                                                                                                                    // 261
  //Usage:                                                                                                          // 262
  //(1) {{cfsDownloadButton "Collection"}} (with file as current context)                                           // 263
  //(2) {{cfsDownloadButton "Collection" file=file}}                                                                // 264
  //(3) {{cfsDownloadButton "Collection" fileId=fileId}}                                                            // 265
  //Supported Options: id, class, content                                                                           // 266
  Handlebars.registerHelper('cfsDownloadButton', function(collection, opts) {                                       // 267
    var fileId, hash, atts;                                                                                         // 268
    hash = opts && opts.hash ? opts.hash : {};                                                                      // 269
    if (hash.file) {                                                                                                // 270
      fileId = hash.file._id;                                                                                       // 271
    } else {                                                                                                        // 272
      fileId = hash.fileId || this._id;                                                                             // 273
    }                                                                                                               // 274
    if (!fileId) {                                                                                                  // 275
      return false;                                                                                                 // 276
    }                                                                                                               // 277
    hash.class = hash.class ? hash.class + ' cfsDownloadButton' :                                                   // 278
            'cfsDownloadButton';                                                                                    // 279
    atts = (hash.id ? ' id="' + hash.id + '"' : '') + (hash.class ?                                                 // 280
            ' class="' + hash.class + '"' : '');                                                                    // 281
    hash.content = hash.content || "Download";                                                                      // 282
    return new Handlebars.SafeString(Template._cfsDownloadButton({                                                  // 283
      collection: collection,                                                                                       // 284
      fileId: fileId,                                                                                               // 285
      content: hash.content,                                                                                        // 286
      attributes: atts                                                                                              // 287
    }));                                                                                                            // 288
  });                                                                                                               // 289
                                                                                                                    // 290
  Template._cfsDownloadButton.events({                                                                              // 291
    'click .cfsDownloadButton': function(event, template) {                                                         // 292
      var fileId = template.data.fileId,                                                                            // 293
              collection = template.data.collection, CFS;                                                           // 294
      if (!fileId || !collection) {                                                                                 // 295
        return false;                                                                                               // 296
      }                                                                                                             // 297
      CFS = window[collection];                                                                                     // 298
      if (!CFS || !CFS.queue) {                                                                                     // 299
        return false;                                                                                               // 300
      }                                                                                                             // 301
      CFS.retrieveBlob(fileId, function(fileItem) {                                                                 // 302
        if (fileItem.blob) {                                                                                        // 303
          window.saveAs(fileItem.blob, fileItem.filename);                                                          // 304
        } else {                                                                                                    // 305
          window.saveAs(fileItem.file, fileItem.filename);                                                          // 306
        }                                                                                                           // 307
      });                                                                                                           // 308
    }                                                                                                               // 309
  });                                                                                                               // 310
                                                                                                                    // 311
  //TODO make this work and test thoroughly                                                                         // 312
  Template._cfsFileInput.events({                                                                                   // 313
    'change .cfsFileInput': function(event, template) {                                                             // 314
      var elem = event.target,                                                                                      // 315
        files = elem.files,                                                                                         // 316
        storeIdsFor = template.data.storeIdsFor,                                                                    // 317
        path = template.data.storeIdsIn,                                                                            // 318
        collection = template.data.collection,                                                                      // 319
        multiple = template.data.multiple,                                                                          // 320
        set = {},                                                                                                   // 321
        collectionName, indexOfFirstDot;                                                                            // 322
      if (files) {                                                                                                  // 323
        var ids = window[collection].storeFiles(files);                                                             // 324
        if (path && path.length) {                                                                                  // 325
          indexOfFirstDot = path.indexOf('.');                                                                      // 326
          if (indexOfFirstDot === -1) {                                                                             // 327
            return;                                                                                                 // 328
          }                                                                                                         // 329
          collectionName = path.slice(0, indexOfFirstDot);                                                          // 330
          path = path.slice(indexOfFirstDot + 1);                                                                   // 331
                                                                                                                    // 332
          if (multiple) {                                                                                           // 333
            setObjByString(set, path, ids);                                                                         // 334
          } else {                                                                                                  // 335
            if (ids.length) {                                                                                       // 336
              setObjByString(set, path, ids[0]);                                                                    // 337
            } else {                                                                                                // 338
              setObjByString(set, path, null);                                                                      // 339
            }                                                                                                       // 340
          }                                                                                                         // 341
          window[collectionName].update(storeIdsFor, {$set: set});                                                  // 342
        }                                                                                                           // 343
      }                                                                                                             // 344
    }                                                                                                               // 345
  });                                                                                                               // 346
                                                                                                                    // 347
  //Usage: (TODO)                                                                                                   // 348
  Handlebars.registerHelper('cfsFileInput', function(collection, options) {                                         // 349
    var html, hash = options.hash, styles, atts;                                                                    // 350
    switch (hash.type) {                                                                                            // 351
      case "file":                                                                                                  // 352
        hash.class = hash.class ? hash.class + ' cfsFileInput' : 'cfsFileInput';                                    // 353
        atts = (hash.id ? ' id="' + hash.id + '"' : '') + (hash.class ?                                             // 354
                ' class="' + hash.class + '"' : '') +                                                               // 355
                (hash.name ? ' name="' + hash.name + '"' : '') +                                                    // 356
                (hash.multiple ? ' multiple' : '');                                                                 // 357
        html = Template._cfsFileInput({                                                                             // 358
          collection: collection,                                                                                   // 359
          multiple: hash.multiple,                                                                                  // 360
          storeIdsIn: hash.storeIdsIn,                                                                              // 361
          storeIdsFor: hash.storeIdsFor,                                                                            // 362
          attributes: atts                                                                                          // 363
        });                                                                                                         // 364
        break;                                                                                                      // 365
      case "image":                                                                                                 // 366
        //TODO                                                                                                      // 367
        break;                                                                                                      // 368
    }                                                                                                               // 369
    return new Handlebars.SafeString(html);                                                                         // 370
  });                                                                                                               // 371
} else {                                                                                                            // 372
  console.log("no handlebars");                                                                                     // 373
}                                                                                                                   // 374
                                                                                                                    // 375
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_utillity.js                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
//utility functions                                                                                                 // 3
// Todo: should be transformed on to file objects?                                                                  // 4
getFileExtension = function(name) {                                                                                 // 5
  var found = name.lastIndexOf('.') + 1;                                                                            // 6
  return (found > 0 ? name.substr(found) : "");                                                                     // 7
};                                                                                                                  // 8
                                                                                                                    // 9
contentTypeInList = function(list, contentType) {                                                                   // 10
  var listType, found = false;                                                                                      // 11
  for (var i = 0, ln = list.length; i < 10; i++) {                                                                  // 12
    listType = list[i]; // TODO: if i > ln                                                                          // 13
    if (listType === contentType) {                                                                                 // 14
      found = true;                                                                                                 // 15
      break;                                                                                                        // 16
    }                                                                                                               // 17
    if (listType === "image/*" && contentType.indexOf("image/") === 0) {                                            // 18
      found = true;                                                                                                 // 19
      break;                                                                                                        // 20
    }                                                                                                               // 21
    if (listType === "audio/*" && contentType.indexOf("audio/") === 0) {                                            // 22
      found = true;                                                                                                 // 23
      break;                                                                                                        // 24
    }                                                                                                               // 25
    if (listType === "video/*" && contentType.indexOf("video/") === 0) {                                            // 26
      found = true;                                                                                                 // 27
      break;                                                                                                        // 28
    }                                                                                                               // 29
  }                                                                                                                 // 30
  return found;                                                                                                     // 31
};                                                                                                                  // 32
                                                                                                                    // 33
setObjByString = function(obj, str, val) {                                                                          // 34
  var keys, key;                                                                                                    // 35
  //make sure str is a nonempty string                                                                              // 36
  if (str === ''+str && str !== '') {                                                                               // 37
    return false;                                                                                                   // 38
  }                                                                                                                 // 39
  if (!Match.test(obj, {})) {                                                                                       // 40
    //if it's not an object, make it one                                                                            // 41
    obj = {};                                                                                                       // 42
  }                                                                                                                 // 43
  keys = str.split(".");                                                                                            // 44
  while (keys.length > 1) {                                                                                         // 45
    key = keys.shift();                                                                                             // 46
    if (obj !== Object(obj)) {                                                                                      // 47
      //if it's not an object, make it one                                                                          // 48
      obj = {};                                                                                                     // 49
    }                                                                                                               // 50
    if (!(key in obj)) {                                                                                            // 51
      //if obj doesn't contain the key, add it and set it to an empty object                                        // 52
      obj[key] = {};                                                                                                // 53
    }                                                                                                               // 54
    obj = obj[key];                                                                                                 // 55
  }                                                                                                                 // 56
  return obj[keys[0]] = val; // TODO: Are we checking or setting?                                                   // 57
};                                                                                                                  // 58
                                                                                                                    // 59
// TODO: Refractor code:                                                                                            // 60
// use check(str, String); or Match.test(str, String);                                                              // 61
isString = function() {                                                                                             // 62
  throw Error('isString deprecated');                                                                               // 63
  // return Object.prototype.toString.call(str) === "[object String]";                                              // 64
};                                                                                                                  // 65
/*                                                                                                                  // 66
NonEmptyString = Match.Where(function (x) {                                                                         // 67
  check(x, String);                                                                                                 // 68
  return x.length > 0;                                                                                              // 69
}                                                                                                                   // 70
*/                                                                                                                  // 71
                                                                                                                    // 72
// TODO: refractor use: !!(check(str, String) && str.length > 0)                                                    // 73
isNonEmptyString = function() {                                                                                     // 74
  throw Error('isNonEmptyString deprecated');                                                                       // 75
  // return isString(str) && str.length;                                                                            // 76
};                                                                                                                  // 77
                                                                                                                    // 78
// TODO: refractor to use: check(obj, Object)                                                                       // 79
isObject = function() {                                                                                             // 80
  throw Error('isObject deprecated');                                                                               // 81
  // return obj === Object(obj);                                                                                    // 82
};                                                                                                                  // 83
                                                                                                                    // 84
var cleanOptions = function() {                                                                                     // 85
  throw Error('cleanOptions deprecated');                                                                           // 86
  // return options;                                                                                                // 87
};                                                                                                                  // 88
                                                                                                                    // 89
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_common.js                                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
// Make files basic functions available in CollectionFS                                                             // 3
_.extend(CollectionFS.prototype, {                                                                                  // 4
	find: function() {                                                                                                 // 5
    return this.files.find.apply(this.files, arguments);                                                            // 6
  },                                                                                                                // 7
	findOne: function() {                                                                                              // 8
    return this.files.findOne.apply(this.files, arguments);                                                         // 9
  },                                                                                                                // 10
	update: function() {                                                                                               // 11
    return this.files.update.apply(this.files, arguments);                                                          // 12
  },                                                                                                                // 13
	remove: function() {                                                                                               // 14
    return this.files.remove.apply(this.files, arguments);                                                          // 15
  },                                                                                                                // 16
	allow: function() {                                                                                                // 17
    return this.files.allow.apply(this.files, arguments);                                                           // 18
  },                                                                                                                // 19
	deny: function() {                                                                                                 // 20
    return this.files.deny.apply(this.files, arguments);                                                            // 21
  },                                                                                                                // 22
	fileHandlers: function(options) {                                                                                  // 23
    _.extend(this._fileHandlers, options);                                                                          // 24
  },                                                                                                                // 25
  filter: function(options) {                                                                                       // 26
    //clean up filter option values                                                                                 // 27
    if (!options.allow || !Match.test(options.allow, Object)) {                                                     // 28
      options.allow = {};                                                                                           // 29
    }                                                                                                               // 30
    if (!options.deny || !Match.test(options.deny, Object)) {                                                       // 31
      options.deny = {};                                                                                            // 32
    }                                                                                                               // 33
    if (!options.maxSize || !_.isNumber(options.maxSize)) {                                                         // 34
      options.maxSize = false;                                                                                      // 35
    }                                                                                                               // 36
    if (!options.allow.extensions || !_.isArray(options.allow.extensions)) {                                        // 37
      options.allow.extensions = [];                                                                                // 38
    }                                                                                                               // 39
    if (!options.allow.contentTypes || !_.isArray(options.allow.contentTypes)) {                                    // 40
      options.allow.contentTypes = [];                                                                              // 41
    }                                                                                                               // 42
    if (!options.deny.extensions || !_.isArray(options.deny.extensions)) {                                          // 43
      options.deny.extensions = [];                                                                                 // 44
    }                                                                                                               // 45
    if (!options.deny.contentTypes || !_.isArray(options.deny.contentTypes)) {                                      // 46
      options.deny.contentTypes = [];                                                                               // 47
    }                                                                                                               // 48
                                                                                                                    // 49
    this._filter = options;                                                                                         // 50
  },                                                                                                                // 51
  fileIsAllowed: function(fileRecord) {                                                                             // 52
    var self = this;                                                                                                // 53
    if (!self._filter) {                                                                                            // 54
      return true;                                                                                                  // 55
    }                                                                                                               // 56
    if (!fileRecord || !fileRecord.contentType || !fileRecord.filename) {                                           // 57
      throw new Error("invalid fileRecord:", fileRecord);                                                           // 58
    }                                                                                                               // 59
    var fileSize = fileRecord.size || parseInt(fileRecord.length, 10);                                              // 60
    if (!fileSize || isNaN(fileSize)) {                                                                             // 61
      throw new Error("invalid fileRecord file size:", fileRecord);                                                 // 62
    }                                                                                                               // 63
    var filter = self._filter;                                                                                      // 64
    if (filter.maxSize && fileSize > filter.maxSize) {                                                              // 65
      self.dispatch('invalid', { maxFileSizeExceeded: true }, fileRecord);                                          // 66
      return false;                                                                                                 // 67
    }                                                                                                               // 68
    var saveAllFileExtensions = (filter.allow.extensions.length === 0);                                             // 69
    var saveAllContentTypes = (filter.allow.contentTypes.length === 0);                                             // 70
    var ext = getFileExtension(fileRecord.filename);                                                                // 71
    var contentType = fileRecord.contentType;                                                                       // 72
    if (!((saveAllFileExtensions ||                                                                                 // 73
            _.indexOf(filter.allow.extensions, ext) !== -1) &&                                                      // 74
            _.indexOf(filter.deny.extensions, ext) === -1)) {                                                       // 75
      self.dispatch('invalid', { disallowedExtension: true }, fileRecord);                                          // 76
      return false;                                                                                                 // 77
    }                                                                                                               // 78
    if (!((saveAllContentTypes ||                                                                                   // 79
            contentTypeInList(filter.allow.contentTypes, contentType)) &&                                           // 80
            !contentTypeInList(filter.deny.contentTypes, contentType))) {                                           // 81
      self.dispatch('invalid', { disallowedContentType: true }, fileRecord);                                        // 82
      return false;                                                                                                 // 83
    }                                                                                                               // 84
    return true;                                                                                                    // 85
  },                                                                                                                // 86
  events: function (events) {                                                                                       // 87
    var self = this;                                                                                                // 88
    _.extend(self._events, events);                                                                                 // 89
  },                                                                                                                // 90
  dispatch: function (/* arguments */) {                                                                            // 91
    var self = this, args = _.toArray(arguments);                                                                   // 92
    var eventName = args.shift();                                                                                   // 93
    self._events[eventName].apply(self, args);                                                                      // 94
  }                                                                                                                 // 95
});                                                                                                                 // 96
                                                                                                                    // 97
_.extend(_queueCollectionFS.prototype, {                                                                            // 98
	queue: {},                                                                                                         // 99
	chunkSize: 256 * 1024,    //gridFS default is 256kb = 262.144bytes                                                 // 100
	compareFile: function(fileRecordA, fileRecordB) {                                                                  // 101
		var errors = 0;                                                                                                   // 102
		var leaveOutField = {                                                                                             // 103
      '_id': true,                                                                                                  // 104
      'uploadDate': true,                                                                                           // 105
      'currentChunk': true,                                                                                         // 106
      'fileHandler': true                                                                                           // 107
    };                                                                                                              // 108
		for (var fieldName in fileRecordA) {                                                                              // 109
			if (!leaveOutField[fieldName]) {                                                                                 // 110
				if (fileRecordA[fieldName] !== fileRecordB[fieldName]) {                                                        // 111
					errors++;                                                                                                      // 112
					console.log(fieldName);                                                                                        // 113
				}                                                                                                               // 114
			}                                                                                                                // 115
		} //EO for                                                                                                        // 116
		return (errors === 0);                                                                                            // 117
	},                                                                                                                 // 118
	makeGridFSFileRecord: function(file, metadata) {                                                                   // 119
		var self = this;                                                                                                  // 120
		var countChunks = Math.ceil(file.size / self.chunkSize);                                                          // 121
		var userId = (Meteor.isClient)?                                                                                   // 122
						( (this.userId) ? this.userId: Meteor.userId() ): file.owner;                                                 // 123
		var encoding = (file.encoding && file.encoding !== '') ?                                                          // 124
            file.encoding : 'utf-8';                                                                                // 125
                                                                                                                    // 126
		return {                                                                                                          // 127
      chunkSize : self.chunkSize,	// Default 256kb ~ 262.144 bytes                                                  // 128
      uploadDate : Date.now(),		// Client/Server set date                                                           // 129
      handledAt: null,            // datetime set by Server when handled                                            // 130
      fileHandler: {},            // fileHandler supplied data if any                                               // 131
      md5 : null,                 // Not yet implemented                                                            // 132
      complete : false,           // countChunks == numChunks                                                       // 133
      currentChunk: -1,           // Used to coordinate clients                                                     // 134
      owner: userId,                                                                                                // 135
      countChunks: countChunks,		// Expected number of chunks                                                       // 136
      numChunks: 0,               // number of chunks in database                                                   // 137
      filename : file.name,       // Original filename                                                              // 138
      length: ''+file.size,       // Issue in Meteor, when solved dont use ''+                                      // 139
      contentType : file.type,                                                                                      // 140
      encoding: encoding,			// Default 'utf-8'                                                                      // 141
      metadata : (metadata) ? metadata : null // Custom data                                                        // 142
      /* TODO:                                                                                                      // 143
      startedAt: null,          // Start timer for upload start                                                     // 144
      endedAt: null,            // Stop timer for upload ended                                                      // 145
      */                                                                                                            // 146
		};                                                                                                                // 147
		// TODO: Implement md5 later, guess every chunk should have a md5...                                              // 148
		// TODO: checkup on gridFS date format                                                                            // 149
	} //EO makeGridFSFileRecord                                                                                        // 150
});                                                                                                                 // 151
                                                                                                                    // 152
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_common.api.fileobject.js                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
/*                                                                                                                  // 3
  COMMON API                                                                                                        // 4
                                                                                                                    // 5
  The fileObject is equal to the fileRecord + client-side api                                                       // 6
  This pattern will allow easier manipulation of files since we now pass                                            // 7
  file objects with methods attatched.                                                                              // 8
  In many cases we are only passed content objects with no reference to the                                         // 9
  collection attached - This way we actually know were the data belongs and                                         // 10
  makes operations much easier.                                                                                     // 11
                                                                                                                    // 12
*/                                                                                                                  // 13
_.extend(_fileObject.prototype, {                                                                                   // 14
  // Expect self to have the properties of fileRecord                                                               // 15
  // Added is self.collection for access to the collection the file belongs                                         // 16
                                                                                                                    // 17
  // TODO: Add common file object api                                                                               // 18
  remove: function() {                                                                                              // 19
    // TODO: Remove this file                                                                                       // 20
  },                                                                                                                // 21
  getExtension: function() {                                                                                        // 22
    var extension;                                                                                                  // 23
    // TODO: parse extension                                                                                        // 24
    return extension;                                                                                               // 25
  },                                                                                                                // 26
  getUrl: function(filehandler) {                                                                                   // 27
    var filehandlerUrl;                                                                                             // 28
    // TODO: return url to filehandler                                                                              // 29
    return filehandlerUrl;                                                                                          // 30
  }                                                                                                                 // 31
});                                                                                                                 // 32
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/numeral.js                                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/*!                                                                                                                 // 1
 * numeral.js                                                                                                       // 2
 * version : 1.4.9                                                                                                  // 3
 * author : Adam Draper                                                                                             // 4
 * license : MIT                                                                                                    // 5
 * http://adamwdraper.github.com/Numeral-js/                                                                        // 6
 */                                                                                                                 // 7
                                                                                                                    // 8
(function() {                                                                                                       // 9
                                                                                                                    // 10
    /************************************                                                                           // 11
     Constants                                                                                                      // 12
     ************************************/                                                                          // 13
                                                                                                                    // 14
    var numeral,                                                                                                    // 15
            VERSION = '1.4.9',                                                                                      // 16
            // internal storage for language config files                                                           // 17
            languages = {},                                                                                         // 18
            currentLanguage = 'en',                                                                                 // 19
            zeroFormat = null,                                                                                      // 20
            // check for nodeJS                                                                                     // 21
            hasModule = (typeof module !== 'undefined' && module.exports);                                          // 22
                                                                                                                    // 23
                                                                                                                    // 24
    /************************************                                                                           // 25
     Constructors                                                                                                   // 26
     ************************************/                                                                          // 27
                                                                                                                    // 28
                                                                                                                    // 29
    // Numeral prototype object                                                                                     // 30
    function Numeral(number) {                                                                                      // 31
        this._n = number;                                                                                           // 32
    }                                                                                                               // 33
                                                                                                                    // 34
    /**                                                                                                             // 35
     * Implementation of toFixed() that treats floats more like decimals                                            // 36
     *                                                                                                              // 37
     * Fixes binary rounding issues (eg. (0.615).toFixed(2) === '0.61') that present                                // 38
     * problems for accounting- and finance-related software.                                                       // 39
     */                                                                                                             // 40
    function toFixed(value, precision, optionals) {                                                                 // 41
        var power = Math.pow(10, precision),                                                                        // 42
                output;                                                                                             // 43
                                                                                                                    // 44
        // Multiply up by precision, round accurately, then divide and use native toFixed():                        // 45
        output = (Math.round(value * power) / power).toFixed(precision);                                            // 46
                                                                                                                    // 47
        if (optionals) {                                                                                            // 48
            var optionalsRegExp = new RegExp('0{1,' + optionals + '}$');                                            // 49
            output = output.replace(optionalsRegExp, '');                                                           // 50
        }                                                                                                           // 51
                                                                                                                    // 52
        return output;                                                                                              // 53
    }                                                                                                               // 54
                                                                                                                    // 55
    /************************************                                                                           // 56
     Formatting                                                                                                     // 57
     ************************************/                                                                          // 58
                                                                                                                    // 59
    // determine what type of formatting we need to do                                                              // 60
    function formatNumeral(n, format) {                                                                             // 61
        var output;                                                                                                 // 62
                                                                                                                    // 63
        // figure out what kind of format we are dealing with                                                       // 64
        if (format.indexOf('$') > -1) { // currency!!!!!                                                            // 65
            output = formatCurrency(n, format);                                                                     // 66
        } else if (format.indexOf('%') > -1) { // percentage                                                        // 67
            output = formatPercentage(n, format);                                                                   // 68
        } else if (format.indexOf(':') > -1) { // time                                                              // 69
            output = formatTime(n, format);                                                                         // 70
        } else { // plain ol' numbers or bytes                                                                      // 71
            output = formatNumber(n, format);                                                                       // 72
        }                                                                                                           // 73
                                                                                                                    // 74
        // return string                                                                                            // 75
        return output;                                                                                              // 76
    }                                                                                                               // 77
                                                                                                                    // 78
    // revert to number                                                                                             // 79
    function unformatNumeral(n, string) {                                                                           // 80
        if (string.indexOf(':') > -1) {                                                                             // 81
            n._n = unformatTime(string);                                                                            // 82
        } else {                                                                                                    // 83
            if (string === zeroFormat) {                                                                            // 84
                n._n = 0;                                                                                           // 85
            } else {                                                                                                // 86
                var stringOriginal = string;                                                                        // 87
                if (languages[currentLanguage].delimiters.decimal !== '.') {                                        // 88
                    string = string.replace(/\./g, '').replace(languages[currentLanguage].delimiters.decimal, '.'); // 89
                }                                                                                                   // 90
                                                                                                                    // 91
                // see if abbreviations are there so that we can multiply to the correct number                     // 92
                var thousandRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.thousand + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$'),
                        millionRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.million + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$'),
                        billionRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.billion + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$'),
                        trillionRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.trillion + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$');
                                                                                                                    // 97
                // see if bytes are there so that we can multiply to the correct number                             // 98
                var prefixes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],                                    // 99
                        bytesMultiplier = false;                                                                    // 100
                                                                                                                    // 101
                for (var power = 0; power <= prefixes.length; power++) {                                            // 102
                    bytesMultiplier = (string.indexOf(prefixes[power]) > -1) ? Math.pow(1024, power + 1) : false;   // 103
                                                                                                                    // 104
                    if (bytesMultiplier) {                                                                          // 105
                        break;                                                                                      // 106
                    }                                                                                               // 107
                }                                                                                                   // 108
                                                                                                                    // 109
                // do some math to create our number                                                                // 110
                n._n = ((bytesMultiplier) ? bytesMultiplier : 1) * ((stringOriginal.match(thousandRegExp)) ? Math.pow(10, 3) : 1) * ((stringOriginal.match(millionRegExp)) ? Math.pow(10, 6) : 1) * ((stringOriginal.match(billionRegExp)) ? Math.pow(10, 9) : 1) * ((stringOriginal.match(trillionRegExp)) ? Math.pow(10, 12) : 1) * ((string.indexOf('%') > -1) ? 0.01 : 1) * Number(((string.indexOf('(') > -1) ? '-' : '') + string.replace(/[^0-9\.-]+/g, ''));
                                                                                                                    // 112
                // round if we are talking about bytes                                                              // 113
                n._n = (bytesMultiplier) ? Math.ceil(n._n) : n._n;                                                  // 114
            }                                                                                                       // 115
        }                                                                                                           // 116
        return n._n;                                                                                                // 117
    }                                                                                                               // 118
                                                                                                                    // 119
    function formatCurrency(n, format) {                                                                            // 120
        var prependSymbol = (format.indexOf('$') <= 1) ? true : false;                                              // 121
                                                                                                                    // 122
        // remove $ for the moment                                                                                  // 123
        var space = '';                                                                                             // 124
                                                                                                                    // 125
        // check for space before or after currency                                                                 // 126
        if (format.indexOf(' $') > -1) {                                                                            // 127
            space = ' ';                                                                                            // 128
            format = format.replace(' $', '');                                                                      // 129
        } else if (format.indexOf('$ ') > -1) {                                                                     // 130
            space = ' ';                                                                                            // 131
            format = format.replace('$ ', '');                                                                      // 132
        } else {                                                                                                    // 133
            format = format.replace('$', '');                                                                       // 134
        }                                                                                                           // 135
                                                                                                                    // 136
        // format the number                                                                                        // 137
        var output = formatNumeral(n, format);                                                                      // 138
                                                                                                                    // 139
        // position the symbol                                                                                      // 140
        if (prependSymbol) {                                                                                        // 141
            if (output.indexOf('(') > -1 || output.indexOf('-') > -1) {                                             // 142
                output = output.split('');                                                                          // 143
                output.splice(1, 0, languages[currentLanguage].currency.symbol + space);                            // 144
                output = output.join('');                                                                           // 145
            } else {                                                                                                // 146
                output = languages[currentLanguage].currency.symbol + space + output;                               // 147
            }                                                                                                       // 148
        } else {                                                                                                    // 149
            if (output.indexOf(')') > -1) {                                                                         // 150
                output = output.split('');                                                                          // 151
                output.splice(-1, 0, space + languages[currentLanguage].currency.symbol);                           // 152
                output = output.join('');                                                                           // 153
            } else {                                                                                                // 154
                output = output + space + languages[currentLanguage].currency.symbol;                               // 155
            }                                                                                                       // 156
        }                                                                                                           // 157
                                                                                                                    // 158
        return output;                                                                                              // 159
    }                                                                                                               // 160
                                                                                                                    // 161
    function formatPercentage(n, format) {                                                                          // 162
        var space = '';                                                                                             // 163
        // check for space before %                                                                                 // 164
        if (format.indexOf(' %') > -1) {                                                                            // 165
            space = ' ';                                                                                            // 166
            format = format.replace(' %', '');                                                                      // 167
        } else {                                                                                                    // 168
            format = format.replace('%', '');                                                                       // 169
        }                                                                                                           // 170
                                                                                                                    // 171
        n._n = n._n * 100;                                                                                          // 172
        var output = formatNumeral(n, format);                                                                      // 173
        if (output.indexOf(')') > -1) {                                                                             // 174
            output = output.split('');                                                                              // 175
            output.splice(-1, 0, space + '%');                                                                      // 176
            output = output.join('');                                                                               // 177
        } else {                                                                                                    // 178
            output = output + space + '%';                                                                          // 179
        }                                                                                                           // 180
        return output;                                                                                              // 181
    }                                                                                                               // 182
                                                                                                                    // 183
    function formatTime(n, format) {                                                                                // 184
        var hours = Math.floor(n._n / 60 / 60),                                                                     // 185
                minutes = Math.floor((n._n - (hours * 60 * 60)) / 60),                                              // 186
                seconds = Math.round(n._n - (hours * 60 * 60) - (minutes * 60));                                    // 187
        return hours + ':' + ((minutes < 10) ? '0' + minutes : minutes) + ':' + ((seconds < 10) ? '0' + seconds : seconds);
    }                                                                                                               // 189
                                                                                                                    // 190
    function unformatTime(string) {                                                                                 // 191
        var timeArray = string.split(':'),                                                                          // 192
                seconds = 0;                                                                                        // 193
        // turn hours and minutes into seconds and add them all up                                                  // 194
        if (timeArray.length === 3) {                                                                               // 195
            // hours                                                                                                // 196
            seconds = seconds + (Number(timeArray[0]) * 60 * 60);                                                   // 197
            // minutes                                                                                              // 198
            seconds = seconds + (Number(timeArray[1]) * 60);                                                        // 199
            // seconds                                                                                              // 200
            seconds = seconds + Number(timeArray[2]);                                                               // 201
        } else if (timeArray.length === 2) {                                                                        // 202
            // minutes                                                                                              // 203
            seconds = seconds + (Number(timeArray[0]) * 60);                                                        // 204
            // seconds                                                                                              // 205
            seconds = seconds + Number(timeArray[1]);                                                               // 206
        }                                                                                                           // 207
        return Number(seconds);                                                                                     // 208
    }                                                                                                               // 209
                                                                                                                    // 210
    function formatNumber(n, format) {                                                                              // 211
        var negP = false,                                                                                           // 212
                optDec = false,                                                                                     // 213
                abbr = '',                                                                                          // 214
                bytes = '',                                                                                         // 215
                ord = '',                                                                                           // 216
                abs = Math.abs(n._n);                                                                               // 217
                                                                                                                    // 218
        // check if number is zero and a custom zero format has been set                                            // 219
        if (n._n === 0 && zeroFormat !== null) {                                                                    // 220
            return zeroFormat;                                                                                      // 221
        } else {                                                                                                    // 222
            // see if we should use parentheses for negative number                                                 // 223
            if (format.indexOf('(') > -1) {                                                                         // 224
                negP = true;                                                                                        // 225
                format = format.slice(1, -1);                                                                       // 226
            }                                                                                                       // 227
                                                                                                                    // 228
            // see if abbreviation is wanted                                                                        // 229
            if (format.indexOf('a') > -1) {                                                                         // 230
                // check for space before abbreviation                                                              // 231
                if (format.indexOf(' a') > -1) {                                                                    // 232
                    abbr = ' ';                                                                                     // 233
                    format = format.replace(' a', '');                                                              // 234
                } else {                                                                                            // 235
                    format = format.replace('a', '');                                                               // 236
                }                                                                                                   // 237
                                                                                                                    // 238
                if (abs >= Math.pow(10, 12)) {                                                                      // 239
                    // trillion                                                                                     // 240
                    abbr = abbr + languages[currentLanguage].abbreviations.trillion;                                // 241
                    n._n = n._n / Math.pow(10, 12);                                                                 // 242
                } else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9)) {                                      // 243
                    // billion                                                                                      // 244
                    abbr = abbr + languages[currentLanguage].abbreviations.billion;                                 // 245
                    n._n = n._n / Math.pow(10, 9);                                                                  // 246
                } else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6)) {                                       // 247
                    // million                                                                                      // 248
                    abbr = abbr + languages[currentLanguage].abbreviations.million;                                 // 249
                    n._n = n._n / Math.pow(10, 6);                                                                  // 250
                } else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3)) {                                       // 251
                    // thousand                                                                                     // 252
                    abbr = abbr + languages[currentLanguage].abbreviations.thousand;                                // 253
                    n._n = n._n / Math.pow(10, 3);                                                                  // 254
                }                                                                                                   // 255
            }                                                                                                       // 256
                                                                                                                    // 257
            // see if we are formatting bytes                                                                       // 258
            if (format.indexOf('b') > -1) {                                                                         // 259
                // check for space before                                                                           // 260
                if (format.indexOf(' b') > -1) {                                                                    // 261
                    bytes = ' ';                                                                                    // 262
                    format = format.replace(' b', '');                                                              // 263
                } else {                                                                                            // 264
                    format = format.replace('b', '');                                                               // 265
                }                                                                                                   // 266
                                                                                                                    // 267
                var prefixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],                               // 268
                        min,                                                                                        // 269
                        max;                                                                                        // 270
                                                                                                                    // 271
                for (var power = 0; power <= prefixes.length; power++) {                                            // 272
                    min = Math.pow(1024, power);                                                                    // 273
                    max = Math.pow(1024, power + 1);                                                                // 274
                                                                                                                    // 275
                    if (n._n >= min && n._n < max) {                                                                // 276
                        bytes = bytes + prefixes[power];                                                            // 277
                        if (min > 0) {                                                                              // 278
                            n._n = n._n / min;                                                                      // 279
                        }                                                                                           // 280
                        break;                                                                                      // 281
                    }                                                                                               // 282
                }                                                                                                   // 283
            }                                                                                                       // 284
                                                                                                                    // 285
            // see if ordinal is wanted                                                                             // 286
            if (format.indexOf('o') > -1) {                                                                         // 287
                // check for space before                                                                           // 288
                if (format.indexOf(' o') > -1) {                                                                    // 289
                    ord = ' ';                                                                                      // 290
                    format = format.replace(' o', '');                                                              // 291
                } else {                                                                                            // 292
                    format = format.replace('o', '');                                                               // 293
                }                                                                                                   // 294
                                                                                                                    // 295
                ord = ord + languages[currentLanguage].ordinal(n._n);                                               // 296
            }                                                                                                       // 297
                                                                                                                    // 298
            if (format.indexOf('[.]') > -1) {                                                                       // 299
                optDec = true;                                                                                      // 300
                format = format.replace('[.]', '.');                                                                // 301
            }                                                                                                       // 302
                                                                                                                    // 303
            var w = n._n.toString().split('.')[0],                                                                  // 304
                    precision = format.split('.')[1],                                                               // 305
                    thousands = format.indexOf(','),                                                                // 306
                    d = '',                                                                                         // 307
                    neg = false;                                                                                    // 308
                                                                                                                    // 309
            if (precision) {                                                                                        // 310
                if (precision.indexOf('[') > -1) {                                                                  // 311
                    precision = precision.replace(']', '');                                                         // 312
                    precision = precision.split('[');                                                               // 313
                    d = toFixed(n._n, (precision[0].length + precision[1].length), precision[1].length);            // 314
                } else {                                                                                            // 315
                    d = toFixed(n._n, precision.length);                                                            // 316
                }                                                                                                   // 317
                                                                                                                    // 318
                w = d.split('.')[0];                                                                                // 319
                                                                                                                    // 320
                if (d.split('.')[1].length) {                                                                       // 321
                    d = languages[currentLanguage].delimiters.decimal + d.split('.')[1];                            // 322
                } else {                                                                                            // 323
                    d = '';                                                                                         // 324
                }                                                                                                   // 325
                                                                                                                    // 326
                if (optDec && Number(d.slice(1)) === 0) {                                                           // 327
                    d = '';                                                                                         // 328
                }                                                                                                   // 329
            } else {                                                                                                // 330
                w = toFixed(n._n, null);                                                                            // 331
            }                                                                                                       // 332
                                                                                                                    // 333
            // format number                                                                                        // 334
            if (w.indexOf('-') > -1) {                                                                              // 335
                w = w.slice(1);                                                                                     // 336
                neg = true;                                                                                         // 337
            }                                                                                                       // 338
                                                                                                                    // 339
            if (thousands > -1) {                                                                                   // 340
                w = w.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + languages[currentLanguage].delimiters.thousands);
            }                                                                                                       // 342
                                                                                                                    // 343
            if (format.indexOf('.') === 0) {                                                                        // 344
                w = '';                                                                                             // 345
            }                                                                                                       // 346
                                                                                                                    // 347
            return ((negP && neg) ? '(' : '') + ((!negP && neg) ? '-' : '') + w + d + ((ord) ? ord : '') + ((abbr) ? abbr : '') + ((bytes) ? bytes : '') + ((negP && neg) ? ')' : '');
        }                                                                                                           // 349
    }                                                                                                               // 350
                                                                                                                    // 351
    /************************************                                                                           // 352
     Top Level Functions                                                                                            // 353
     ************************************/                                                                          // 354
                                                                                                                    // 355
    numeral = function(input) {                                                                                     // 356
        if (numeral.isNumeral(input)) {                                                                             // 357
            input = input.value();                                                                                  // 358
        } else if (!Number(input)) {                                                                                // 359
            input = 0;                                                                                              // 360
        }                                                                                                           // 361
                                                                                                                    // 362
        return new Numeral(Number(input));                                                                          // 363
    };                                                                                                              // 364
                                                                                                                    // 365
    // version number                                                                                               // 366
    numeral.version = VERSION;                                                                                      // 367
                                                                                                                    // 368
    // compare numeral object                                                                                       // 369
    numeral.isNumeral = function(obj) {                                                                             // 370
        return obj instanceof Numeral;                                                                              // 371
    };                                                                                                              // 372
                                                                                                                    // 373
    // This function will load languages and then set the global language.  If                                      // 374
    // no arguments are passed in, it will simply return the current global                                         // 375
    // language key.                                                                                                // 376
    numeral.language = function(key, values) {                                                                      // 377
        if (!key) {                                                                                                 // 378
            return currentLanguage;                                                                                 // 379
        }                                                                                                           // 380
                                                                                                                    // 381
        if (key && !values) {                                                                                       // 382
            if (!languages[key]) {                                                                                  // 383
                throw new Error('Unknown language : ' + key);                                                       // 384
            }                                                                                                       // 385
            currentLanguage = key;                                                                                  // 386
        }                                                                                                           // 387
                                                                                                                    // 388
        if (values || !languages[key]) {                                                                            // 389
            loadLanguage(key, values);                                                                              // 390
        }                                                                                                           // 391
                                                                                                                    // 392
        return numeral;                                                                                             // 393
    };                                                                                                              // 394
                                                                                                                    // 395
    numeral.language('en', {                                                                                        // 396
        delimiters: {                                                                                               // 397
            thousands: ',',                                                                                         // 398
            decimal: '.'                                                                                            // 399
        },                                                                                                          // 400
        abbreviations: {                                                                                            // 401
            thousand: 'k',                                                                                          // 402
            million: 'm',                                                                                           // 403
            billion: 'b',                                                                                           // 404
            trillion: 't'                                                                                           // 405
        },                                                                                                          // 406
        ordinal: function(number) {                                                                                 // 407
            var b = number % 10;                                                                                    // 408
            return (~~(number % 100 / 10) === 1) ? 'th' :                                                           // 409
                    (b === 1) ? 'st' :                                                                              // 410
                    (b === 2) ? 'nd' :                                                                              // 411
                    (b === 3) ? 'rd' : 'th';                                                                        // 412
        },                                                                                                          // 413
        currency: {                                                                                                 // 414
            symbol: '$'                                                                                             // 415
        }                                                                                                           // 416
    });                                                                                                             // 417
                                                                                                                    // 418
    numeral.zeroFormat = function(format) {                                                                         // 419
        if (typeof(format) === 'string') {                                                                          // 420
            zeroFormat = format;                                                                                    // 421
        } else {                                                                                                    // 422
            zeroFormat = null;                                                                                      // 423
        }                                                                                                           // 424
    };                                                                                                              // 425
                                                                                                                    // 426
    /************************************                                                                           // 427
     Helpers                                                                                                        // 428
     ************************************/                                                                          // 429
                                                                                                                    // 430
    function loadLanguage(key, values) {                                                                            // 431
        languages[key] = values;                                                                                    // 432
    }                                                                                                               // 433
                                                                                                                    // 434
                                                                                                                    // 435
    /************************************                                                                           // 436
     Numeral Prototype                                                                                              // 437
     ************************************/                                                                          // 438
                                                                                                                    // 439
                                                                                                                    // 440
    numeral.fn = Numeral.prototype = {                                                                              // 441
        clone: function() {                                                                                         // 442
            return numeral(this);                                                                                   // 443
        },                                                                                                          // 444
        format: function(inputString) {                                                                             // 445
            return formatNumeral(this, inputString ? inputString : numeral.defaultFormat);                          // 446
        },                                                                                                          // 447
        unformat: function(inputString) {                                                                           // 448
            return unformatNumeral(this, inputString ? inputString : numeral.defaultFormat);                        // 449
        },                                                                                                          // 450
        value: function() {                                                                                         // 451
            return this._n;                                                                                         // 452
        },                                                                                                          // 453
        valueOf: function() {                                                                                       // 454
            return this._n;                                                                                         // 455
        },                                                                                                          // 456
        set: function(value) {                                                                                      // 457
            this._n = Number(value);                                                                                // 458
            return this;                                                                                            // 459
        },                                                                                                          // 460
        add: function(value) {                                                                                      // 461
            this._n = this._n + Number(value);                                                                      // 462
            return this;                                                                                            // 463
        },                                                                                                          // 464
        subtract: function(value) {                                                                                 // 465
            this._n = this._n - Number(value);                                                                      // 466
            return this;                                                                                            // 467
        },                                                                                                          // 468
        multiply: function(value) {                                                                                 // 469
            this._n = this._n * Number(value);                                                                      // 470
            return this;                                                                                            // 471
        },                                                                                                          // 472
        divide: function(value) {                                                                                   // 473
            this._n = this._n / Number(value);                                                                      // 474
            return this;                                                                                            // 475
        },                                                                                                          // 476
        difference: function(value) {                                                                               // 477
            var difference = this._n - Number(value);                                                               // 478
                                                                                                                    // 479
            if (difference < 0) {                                                                                   // 480
                difference = -difference;                                                                           // 481
            }                                                                                                       // 482
                                                                                                                    // 483
            return difference;                                                                                      // 484
        }                                                                                                           // 485
                                                                                                                    // 486
    };                                                                                                              // 487
                                                                                                                    // 488
    /************************************                                                                           // 489
     Exposing Numeral                                                                                               // 490
     ************************************/                                                                          // 491
                                                                                                                    // 492
    // CommonJS module is defined                                                                                   // 493
    if (hasModule) {                                                                                                // 494
        module.exports = numeral;                                                                                   // 495
    }                                                                                                               // 496
                                                                                                                    // 497
    /*global ender:false */                                                                                         // 498
    if (typeof ender === 'undefined') {                                                                             // 499
        // here, `this` means `window` in the browser, or `global` on the server                                    // 500
        // add `numeral` as a global object via a string identifier,                                                // 501
        // for Closure Compiler 'advanced' mode                                                                     // 502
        this['numeral'] = numeral;                                                                                  // 503
    }                                                                                                               // 504
                                                                                                                    // 505
    /*global define:false */                                                                                        // 506
    if (typeof define === 'function' && define.amd) {                                                               // 507
        define([], function() {                                                                                     // 508
            return numeral;                                                                                         // 509
        });                                                                                                         // 510
    }                                                                                                               // 511
}).call(this);                                                                                                      // 512
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);
