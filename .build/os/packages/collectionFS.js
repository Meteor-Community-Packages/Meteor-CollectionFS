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
// packages/collectionFS/collectionFS_filesystem.js                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// REMOVE: When engien branche is merged with master in Meteor v0.6.0 ?                                             // 1
if (typeof Npm === 'undefined') {                                                                                   // 2
  throw new Error('collectionFS: Please update Meteor');                                                            // 3
}                                                                                                                   // 4
  /*                                                                                                                // 5
  // Polyfill for Npm                                                                                               // 6
  var path = __meteor_bootstrap__.require('path');                                                                  // 7
  Npm = {                                                                                                           // 8
    require: __meteor_bootstrap__.require,                                                                          // 9
    bundleRoot: path.dirname(__meteor_bootstrap__.require.main.filename)                                            // 10
  };                                                                                                                // 11
} else { */                                                                                                         // 12
  // Cannot rely on __meteor_bootstrap__.require.main.filename so we try this:                                      // 13
if (! Npm.bundleRoot ) {                                                                                            // 14
  var path = Npm.require('path');                                                                                   // 15
  _.extend(Npm, {                                                                                                   // 16
    bundleRoot: (process && process.mainModule &&                                                                   // 17
            process.mainModule.filename)?                                                                           // 18
            path.join(process.mainModule.filename, '..') : ''                                                       // 19
  });                                                                                                               // 20
}                                                                                                                   // 21
//}                                                                                                                 // 22
                                                                                                                    // 23
// Test if we have found a bundleRoot                                                                               // 24
if (! Npm.bundleRoot){                                                                                              // 25
  throw new Error('Cannot find bundle root directory');                                                             // 26
}                                                                                                                   // 27
/**** EO Npm polyfill extended bundleRoot ******/                                                                   // 28
                                                                                                                    // 29
// Init config flags                                                                                                // 30
__meteor_runtime_config__.FILEHANDLER_SUPPORTED = false;                                                            // 31
                                                                                                                    // 32
__filehandlers = {                                                                                                  // 33
  // Filesystem configuration                                                                                       // 34
  folder: 'cfs',                                                                                                    // 35
  // Main folder to place collectionFS filehandler folders in                                                       // 36
                                                                                                                    // 37
  serverPath: '',         // Auto                                                                                   // 38
  bundlePath: '',         // Auto                                                                                   // 39
  url: '',                // Auto                                                                                   // 40
  rootDir: '',            // Auto                                                                                   // 41
  bundleStaticPath: '',   // Auto                                                                                   // 42
  bundleRoot: '',         // Auto                                                                                   // 43
  created: false,         // Auto                                                                                   // 44
                                                                                                                    // 45
  // Configuration flags                                                                                            // 46
  MaxRunning: 1,                                                                                                    // 47
  // Max filehandlers running at the same time in total on server,                                                  // 48
  // not pr. collectionFS                                                                                           // 49
                                                                                                                    // 50
  Running: 0,                                                                                                       // 51
  // Filehandlers running at the same time in total on server,                                                      // 52
  // not pr. collectionFS                                                                                           // 53
                                                                                                                    // 54
  MaxFailes: 3,                                                                                                     // 55
  // Retries each failed filehandler 3 times and moves on to next failed                                            // 56
                                                                                                                    // 57
  // Allow a reset of filehandler failures to try again?                                                            // 58
  AllowFailesRetry: 60*1000,                                                                                        // 59
  // Wait ms before trying again, if == 0 then disabled                                                             // 60
                                                                                                                    // 61
  _AllowFailesRetryLastTime: 0,                                                                                     // 62
  // Auto - Carry for wait timer                                                                                    // 63
                                                                                                                    // 64
  // How often to run filehandlers pr. file                                                                         // 65
  waitBeforeCheckingQueue: 1000,                                                                                    // 66
  // Default 1000ms / 1sec, 0 disables filehandlers                                                                 // 67
                                                                                                                    // 68
  waitBeforeCheckingQueueWhenNoFilehandlers: 5000                                                                   // 69
  // Default 5000ms / 5sec - no filehandlers defined yet, we wait? 0 disables                                       // 70
};                                                                                                                  // 71
                                                                                                                    // 72
                                                                                                                    // 73
var fs = Npm.require('fs');                                                                                         // 74
var path = Npm.require('path');                                                                                     // 75
                                                                                                                    // 76
__filehandlers.url = '/' + __filehandlers.folder;                                                                   // 77
__filehandlers.bundleRoot = Npm.bundleRoot;                                                                         // 78
__filehandlers.rootDir =                                                                                            // 79
        path.join(__filehandlers.bundleRoot, '..') + path.sep;                                                      // 80
__filehandlers.bundleStaticPath =                                                                                   // 81
        path.join(__filehandlers.bundleRoot, 'static');                                                             // 82
__filehandlers.bundlePath =                                                                                         // 83
        path.join(__filehandlers.bundleStaticPath, __filehandlers.folder);                                          // 84
__filehandlers.serverPath =                                                                                         // 85
        path.join(__filehandlers.rootDir, __filehandlers.folder);                                                   // 86
                                                                                                                    // 87
serverConsole.log('bundlePath: '+__filehandlers.bundlePath);                                                        // 88
serverConsole.log('serverPath: '+__filehandlers.serverPath);                                                        // 89
                                                                                                                    // 90
// Check if the bundle static folder exists, if not then create Issue #40                                           // 91
if (!fs.existsSync(__filehandlers.bundleStaticPath)){                                                               // 92
  fs.mkdirSync(__filehandlers.bundleStaticPath);                                                                    // 93
}                                                                                                                   // 94
                                                                                                                    // 95
// Remove symlink                                                                                                   // 96
try {                                                                                                               // 97
  fs.rmdirSync(__filehandlers.bundlePath);                                                                          // 98
} catch(e) { /* NOP */}                                                                                             // 99
                                                                                                                    // 100
try {                                                                                                               // 101
  fs.unlinkSync(__filehandlers.bundlePath);                                                                         // 102
} catch(e) { /* NOP  */}                                                                                            // 103
                                                                                                                    // 104
// Check if server path exists, if not then create                                                                  // 105
if (!fs.existsSync(__filehandlers.serverPath)){                                                                     // 106
  fs.mkdirSync(__filehandlers.serverPath);                                                                          // 107
}                                                                                                                   // 108
                                                                                                                    // 109
// Create symlink                                                                                                   // 110
if (!!fs.existsSync(__filehandlers.serverPath)) {                                                                   // 111
  serverConsole.log('Create symlinkSync');                                                                          // 112
  fs.symlinkSync( __filehandlers.serverPath, __filehandlers.bundlePath );                                           // 113
}                                                                                                                   // 114
                                                                                                                    // 115
__filehandlers.created = (!!fs.existsSync(__filehandlers.bundlePath));                                              // 116
                                                                                                                    // 117
__meteor_runtime_config__.FILEHANDLER_SUPPORTED =                                                                   // 118
        fs.existsSync(__filehandlers.serverPath);                                                                   // 119
                                                                                                                    // 120
                                                                                                                    // 121
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_server.js                                                                     //
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
"use strict";                                                                                                       // 8
                                                                                                                    // 9
var fs = Npm.require('fs');                                                                                         // 10
var path = Npm.require('path');                                                                                     // 11
                                                                                                                    // 12
// Transform api onto file objects                                                                                  // 13
_fileObject = function(doc, collection) {                                                                           // 14
  var self = this;                                                                                                  // 15
  self.collection = collection;                                                                                     // 16
  _.extend(self, doc);                                                                                              // 17
};                                                                                                                  // 18
                                                                                                                    // 19
// @export CollectionFS                                                                                             // 20
CollectionFS = function(name, options) {                                                                            // 21
	var self = this;                                                                                                   // 22
	self._name = name;                                                                                                 // 23
  // Map server api as transformation                                                                               // 24
	self.files = new Meteor.Collection(self._name+'.files', {                                                          // 25
    transform: function(doc) {                                                                                      // 26
      return new _fileObject(doc, self);                                                                            // 27
    }                                                                                                               // 28
  });                                                                                                               // 29
  // TODO: Add change listener?                                                                                     // 30
  self.chunks = new Meteor.Collection(self._name+'.chunks');                                                        // 31
	self.queue = new _queueCollectionFS(name);                                                                         // 32
	self._fileHandlers = {}; // Set by function fileHandlers({});                                                      // 33
  self._filter = null;  // Set by function filter({});                                                              // 34
	var methodFunc = {};										// Server methods                                                                    // 35
                                                                                                                    // 36
	serverConsole.log('CollectionFS: ' + name);                                                                        // 37
                                                                                                                    // 38
	// Extend _options                                                                                                 // 39
	self._options = { autopublish: true,                                                                               // 40
          maxFilehandlers: __filehandlers.MaxRunning                                                                // 41
  };                                                                                                                // 42
	_.extend(self._options, options);                                                                                  // 43
                                                                                                                    // 44
  //events                                                                                                          // 45
  self._events = {                                                                                                  // 46
    'ready': function() {},                                                                                         // 47
    'invalid': function() {}, //arg1 = CFSErrorType enum, arg2 = fileRecord                                         // 48
    'progress': function() {}, //arg1 = progress percentage as integer                                              // 49
    'start': function() {},                                                                                         // 50
    'stop': function() {},                                                                                          // 51
    'resume': function() {}                                                                                         // 52
  };                                                                                                                // 53
                                                                                                                    // 54
	// User is able to set maxFilehandlers - could be other globals to if needed                                       // 55
	__filehandlers.MaxRunning = self._options.maxFilehandlers;                                                         // 56
                                                                                                                    // 57
	// Setup autopublish if not flag'ed out                                                                            // 58
	if (self._options.autopublish) {                                                                                   // 59
    Meteor.publish(self._name+'.files', function () {                                                               // 60
      return self.find({});                                                                                         // 61
    }, {is_auto: true});                                                                                            // 62
	} //EO Autopublish                                                                                                 // 63
                                                                                                                    // 64
	// Save data into file in collection                                                                               // 65
	methodFunc['saveChunck'+self._name] =                                                                              // 66
          function(fileId, chunkNumber, countChunks, data) {                                                        // 67
    this.unblock();                                                                                                 // 68
		if ( fileId ) {                                                                                                   // 69
                                                                                                                    // 70
			var cId = self.chunks.insert({                                                                                   // 71
				"files_id" : fileId,  // _id of the corresponding files collection entry                                        // 72
        "n" : chunkNumber,          // chunks are numbered in order, starting with 0                                // 73
        "data" : data // the chunk's payload as a BSON binary type                                                  // 74
			});                                                                                                              // 75
                                                                                                                    // 76
			if (cId) { //If chunk added successful                                                                           // 77
				var numChunks = self.chunks.find({ "files_id": fileId }).count();                                               // 78
                                                                                                                    // 79
				self.files.update({ _id: fileId }, {                                                                            // 80
					$set: {                                                                                                        // 81
            complete: (countChunks === numChunks),                                                                  // 82
            currentChunk: chunkNumber+1,                                                                            // 83
            numChunks: numChunks                                                                                    // 84
          }                                                                                                         // 85
				});                                                                                                             // 86
                                                                                                                    // 87
				return {                                                                                                        // 88
					fileId: fileId,                                                                                                // 89
					chunkId: cId,                                                                                                  // 90
					complete: (countChunks === numChunks),                                                                         // 91
					currentChunk: chunkNumber+1                                                                                    // 92
				};                                                                                                              // 93
                                                                                                                    // 94
			} //If cId                                                                                                       // 95
		} //EO got fileId                                                                                                 // 96
	}; //EO saveChunck+name                                                                                            // 97
                                                                                                                    // 98
	// Return requested data from chunk in file                                                                        // 99
	methodFunc['loadChunck'+self._name] = function(fileId, chunkNumber, countChunks) {                                 // 100
    this.unblock();                                                                                                 // 101
		if ( fileId ) {                                                                                                   // 102
			var chunk = self.chunks.findOne({                                                                                // 103
				"files_id" : fileId,  // _id of the corresponding files collection entry                                        // 104
        "n" : chunkNumber          // chunks are numbered in order, starting with 0                                 // 105
      });                                                                                                           // 106
                                                                                                                    // 107
			return {                                                                                                         // 108
				fileId: fileId,                                                                                                 // 109
				chunkId: chunk._id,                                                                                             // 110
				currentChunk:chunkNumber,                                                                                       // 111
				complete: (chunkNumber === countChunks-1),                                                                      // 112
				data: chunk.data                                                                                                // 113
			};                                                                                                               // 114
		} //EO fileId                                                                                                     // 115
	}; //EO saveChunck+name                                                                                            // 116
                                                                                                                    // 117
	methodFunc['getMissingChunk'+self._name] = function(fileId) {                                                      // 118
		//console.log('getMissingChunk: '+fileRecord._id);                                                                // 119
		var self = this;                                                                                                  // 120
		var fileRecord = self.files.findOne({_id: fileId});                                                               // 121
                                                                                                                    // 122
		if (fileRecord) {                                                                                                 // 123
			//Check file chunks if they are all there                                                                        // 124
			//Return missing chunk id                                                                                        // 125
			if (fileRecord.currentChunk === fileRecord.countChunks) { //Ok                                                   // 126
				for (var cnr = 0; cnr < fileRecord.countChunks; cnr++) {                                                        // 127
					//Really? loop though all chunks? cant mongo or gridFS                                                         // 128
          // do this better? TODO: Readup specs/docs                                                                // 129
          if (!self.chunks.findOne({                                                                                // 130
            files_id: fileRecord._id,                                                                               // 131
            n: cnr                                                                                                  // 132
          },                                                                                                        // 133
            { fields: { data:0 } })) {                                                                              // 134
            //File error - missing chunks..                                                                         // 135
						return cnr; //Return cnr that is missing                                                                      // 136
					}                                                                                                              // 137
				}                                                                                                               // 138
				return false; //Checked and good to go (need md5?)                                                              // 139
			} else {                                                                                                         // 140
				return fileRecord.currentChunk;                                                                                 // 141
        //return missing chunk to continue - fileupload not complete                                                // 142
      }                                                                                                             // 143
		} else {                                                                                                          // 144
			// No fileRecord found                                                                                           // 145
			throw new Error('getMissingChunk file not found: ' + fileId);                                                    // 146
		}                                                                                                                 // 147
	}; //EO getMissingChunk                                                                                            // 148
                                                                                                                    // 149
	// Add object specific server methods                                                                              // 150
	Meteor.methods(methodFunc);                                                                                        // 151
                                                                                                                    // 152
	//Init queueListener for fileHandling at the server                                                                // 153
  Meteor.startup(function () {                                                                                      // 154
    //Ensure chunks index on files_id and n                                                                         // 155
    self.chunks._ensureIndex({ files_id: 1, n: 1 }, { unique: true });                                              // 156
		//Spawn queue listener                                                                                            // 157
		self.queueListener = new _queueListener(self);                                                                    // 158
                                                                                                                    // 159
		// Add observer removed                                                                                           // 160
    self.files.find(arguments, options).observe({                                                                   // 161
        removed: function(doc) {                                                                                    // 162
            // remove all chunks, make sure _id isset, don't mess up                                                // 163
            if (doc._id) {                                                                                          // 164
              self.chunks.remove({ files_id: doc._id });                                                            // 165
            }                                                                                                       // 166
            // Check to se if any filehandlers worked the file                                                      // 167
            if (Object.keys(doc.fileHandler).length > 0) {                                                          // 168
              // Walk through the filehandlers                                                                      // 169
              _.each(doc.fileHandler, function(fileHandler, func) {                                                 // 170
                // If url isset and beginning with '/' we have a local file?                                        // 171
                if (fileHandler.url && fileHandler.url.substr(0, 1) === '/') {                                      // 172
                  // Reconstruct local absolute path to file                                                        // 173
                  var myServerPath = path.join(                                                                     // 174
                          __filehandlers.rootDir,                                                                   // 175
                          fileHandler.url.substr(1));                                                               // 176
                  // If file exists then                                                                            // 177
                  if (!!fs.existsSync(myServerPath) ){                                                              // 178
                    try {                                                                                           // 179
                      // Remove the file                                                                            // 180
                      fs.unlinkSync(myServerPath);                                                                  // 181
                    } catch(e) { /* NOP */ }                                                                        // 182
                  } // EO fileexists                                                                                // 183
                } // Local file                                                                                     // 184
              }); // EO each                                                                                        // 185
            } // EO fileHandler's found                                                                             // 186
          } // EO removed                                                                                           // 187
      }); // EO Observer                                                                                            // 188
                                                                                                                    // 189
	}); // Startup                                                                                                     // 190
                                                                                                                    // 191
}; //EO collectionFS                                                                                                // 192
                                                                                                                    // 193
_queueCollectionFS = function(name) {                                                                               // 194
	var self = this;                                                                                                   // 195
	self._name = name;                                                                                                 // 196
};                                                                                                                  // 197
                                                                                                                    // 198
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_filehandlers.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// Server cache worker, idear:                                                                                      // 1
//                                                                                                                  // 2
// Basics                                                                                                           // 3
// On server load init worker and taskQue if needed by collection                                                   // 4
// if (fileHandlers)                                                                                                // 5
// When client confirms uploads run user defined functions on file described in                                     // 6
// fileHandlers                                                                                                     // 7
// if null returned then proceed to the next function in fileHandler array                                          // 8
// if data returned then put it in a file in eg.:  uploads/cfs/collection._name                                     // 9
// folder and update url array reference in database, triggers reactive                                             // 10
// update UI                                                                                                        // 11
// Note: updating files in uploads refreshes server? - find solution later,                                         // 12
// maybe patch meteor core?                                                                                         // 13
//                                                                                                                  // 14
// In model:                                                                                                        // 15
// CollectionFS.fileHandlers({                                                                                      // 16
//   //Default image cache                                                                                          // 17
//   handler['default']: function(fileId, blob) {                                                                   // 18
//     return blob;                                                                                                 // 19
//   },                                                                                                             // 20
//   //Some specific                                                                                                // 21
//   handler['40x40']: function(fileId, blob) {                                                                     // 22
//      //Some serverside image/file handling functions, user can define this                                       // 23
//      return blob;                                                                                                // 24
//    },                                                                                                            // 25
//   //Upload to remote server                                                                                      // 26
//   handler['remote']: function(fileId, blob) {                                                                    // 27
//      //Some serverside imagick/file handling functions, user can define this                                     // 28
//      return null;                                                                                                // 29
//    },                                                                                                            // 30
//                                                                                                                  // 31
// });                                                                                                              // 32
//                                                                                                                  // 33
// Server:                                                                                                          // 34
// on startup queueListener spawned if needed by collectionFS - one                                                 // 35
// queueListener pr collectionFS                                                                                    // 36
// queueListener spawns fileHandlers pr. item in fileHandlerQue as                                                  // 37
// setTimeout(, 0) and delete item from queue                                                                       // 38
// if empty queue then die and wait, spawn by interval                                                              // 39
// server sets .handledAt = Date.now(), .fileHandler[]                                                              // 40
// fileHandlers die after ended                                                                                     // 41
// Filehandlers respect __filehandlers.MaxRunning on server, set to 1 pr.                                           // 42
// default for throttling the server.                                                                               // 43
//                                                                                                                  // 44
// Client:                                                                                                          // 45
// When upload confirmed complete, set fs.files.complete and add _id to                                             // 46
// collectionFS.fileHandlerQue (wich triggers a worker at interval)                                                 // 47
//                                                                                                                  // 48
                                                                                                                    // 49
//var queueListener = new _queueListener();                                                                         // 50
                                                                                                                    // 51
"use strict";                                                                                                       // 52
                                                                                                                    // 53
var fs = Npm.require('fs');                                                                                         // 54
var path = Npm.require('path');                                                                                     // 55
                                                                                                                    // 56
_.extend(_fileObject.prototype, {                                                                                   // 57
  // Expect self to have the properties of fileRecord                                                               // 58
  // Added is self.collection for access to the collection the file belongs                                         // 59
                                                                                                                    // 60
                                                                                                                    // 61
  filehandler: {  // TODO: Add filehandlers file object api                                                         // 62
    destination: function(newExtension) { // destination                                                            // 63
      // TODO: Refractor destination                                                                                // 64
    },                                                                                                              // 65
    push: function(filehandler, destinationObject) {                                                                // 66
      // TODO: Add / Update filehandler                                                                             // 67
    },                                                                                                              // 68
    pop: function(filehandler, destinationObject) {                                                                 // 69
      // TODO: Remove filehandler                                                                                   // 70
    }                                                                                                               // 71
  }                                                                                                                 // 72
});                                                                                                                 // 73
                                                                                                                    // 74
_queueListener = function(collectionFS) {                                                                           // 75
	var self = this;                                                                                                   // 76
	self.collectionFS = collectionFS;                                                                                  // 77
                                                                                                                    // 78
    // Init directory for collection                                                                                // 79
	self.serverPath = path.join(__filehandlers.serverPath,                                                             // 80
          self.collectionFS._name);  // Server path                                                                 // 81
	self.pathURL = __filehandlers.url + '/' + self.collectionFS._name; // Url path                                     // 82
                                                                                                                    // 83
	if (!fs.existsSync(self.serverPath)) {                                                                             // 84
    fs.mkdirSync(self.serverPath);                                                                                  // 85
  }                                                                                                                 // 86
                                                                                                                    // 87
	self.pathCreated = (!!fs.existsSync(self.serverPath));                                                             // 88
                                                                                                                    // 89
	//Spawn worker:                                                                                                    // 90
	Meteor.setTimeout(function() { self.checkQueue(); }, 0); //Init worker process                                     // 91
                                                                                                                    // 92
};//EO queueListener                                                                                                // 93
                                                                                                                    // 94
_.extend(_queueListener.prototype, {                                                                                // 95
	checkQueue: function() {                                                                                           // 96
		var self = this;                                                                                                  // 97
		//check items in queue and init workers for conversion                                                            // 98
		if (self.collectionFS) {                                                                                          // 99
			if (self.collectionFS._fileHandlers) {                                                                           // 100
				//ok got filehandler object, spawn worker?                                                                      // 101
				if (__filehandlers.Running < __filehandlers.MaxRunning) {                                                       // 102
					__filehandlers.Running++;                                                                                      // 103
                                                                                                                    // 104
					// First, Try to find new unhandled files                                                                      // 105
					var fileRecord = self.collectionFS.findOne({ handledAt: null,                                                  // 106
                  complete: true }); //test sumChunk == countChunks in mongo?                                       // 107
                                                                                                                    // 108
					// Second, check if not complete and remoteFile is set then we have                                            // 109
          // an load file order                                                                                     // 110
          if (!fileRecord) {                                                                                        // 111
            fileRecord = self.collectionFS.findOne({                                                                // 112
              $exists: { remoteFile: true },                                                                        // 113
              complete: false                                                                                       // 114
            }); //test sumChunk == countChunks in mongo?                                                            // 115
          }                                                                                                         // 116
					// Third, Try to find new filehandlers, not yet applied                                                        // 117
					if (!fileRecord) {                                                                                             // 118
						// Create a query array from filehandlers                                                                     // 119
						var queryFilehandlersExists = [];                                                                             // 120
						for (var func in self.collectionFS._fileHandlers) {                                                           // 121
							var queryExists = {};                                                                                        // 122
							queryExists['fileHandler.'+func] = { $exists: false };                                                       // 123
							queryFilehandlersExists.push(queryExists);                                                                   // 124
						}                                                                                                             // 125
                                                                                                                    // 126
						//	Where one of the fileHandlers are missing                                                                  // 127
            if (queryFilehandlersExists.length > 0) {                                                               // 128
              fileRecord = self.collectionFS.findOne({ complete: true,                                              // 129
                                   $or: queryFilehandlersExists,                                                    // 130
                                   'fileHandler.error': { $exists: false } });                                      // 131
            }                                                                                                       // 132
					} // EO Try to find new filehandlers                                                                           // 133
                                                                                                                    // 134
					// Last, Try to find failed filehanders                                                                        // 135
					if (!fileRecord) {                                                                                             // 136
						// Create a query array from filehandlers                                                                     // 137
						var queryFilehandlersFailed = [];                                                                             // 138
						for (var func in self.collectionFS._fileHandlers) {                                                           // 139
							var queryFailed = {};                                                                                        // 140
							queryFailed['fileHandler.' + func + '.failed'] = { $exists: true,                                            // 141
                      $lt: __filehandlers.MaxFailes,                                                                // 142
                      'fileHandler.error': { $exists: false } };                                                    // 143
							queryFilehandlersFailed.push(queryFailed);                                                                   // 144
						}                                                                                                             // 145
                                                                                                                    // 146
						//  Where the fileHandler contains an element with a failed set less                                          // 147
            //  than __filehandlers.MaxFailes                                                                       // 148
            if (queryFilehandlersFailed.length > 0) {                                                               // 149
              fileRecord = self.collectionFS.findOne({ complete: true,                                              // 150
                                   $or: queryFilehandlersFailed });                                                 // 151
            }                                                                                                       // 152
					}                                                                                                              // 153
                                                                                                                    // 154
					// Handle file, spawn worker                                                                                   // 155
					if (fileRecord) {                                                                                              // 156
                                                                                                                    // 157
						// Test if remoteFile isset                                                                                   // 158
						if (fileRecord.remoteFile){                                                                                   // 159
              self.workLoadRemoteFile(fileRecord);                                                                  // 160
            }else{                                                                                                  // 161
              self.workFileHandlers(fileRecord,                                                                     // 162
                      self.collectionFS._fileHandlers);                                                             // 163
            }                                                                                                       // 164
						// Update idle                                                                                                // 165
						__filehandlers._AllowFailesRetryLastTime = Date.now();                                                        // 166
					} else {                                                                                                       // 167
						// We shouldn't get bored, are we going to retry failed filehandlers                                          // 168
            // or sleep a bit or eight?                                                                             // 169
						if (__filehandlers.AllowFailesRetry ) {                                                                       // 170
							var waitedEnough = ((__filehandlers._AllowFailesRetryLastTime +                                              // 171
                      __filehandlers.AllowFailesRetry) < Date.now());                                               // 172
							// We wait a period before retrying                                                                          // 173
							if ( waitedEnough ) {                                                                                        // 174
                for (var func in self.collectionFS._fileHandlers) {                                                 // 175
                  // reset failed to 1 on all failed filehandlers, triggering a                                     // 176
                  // restart of failed retry                                                                        // 177
                  var queryFailed = {};                                                                             // 178
                  var querySetFailed = {};                                                                          // 179
                  queryFailed['fileHandler.' + func + '.failed'] =                                                  // 180
                          { $exists: true };                                                                        // 181
                  querySetFailed['fileHandler.' + func + '.failed'] = 1;                                            // 182
                  // We do reset pr. filehandler                                                                    // 183
                  self.collectionFS.update(queryFailed,                                                             // 184
                          { $set: querySetFailed });                                                                // 185
                }                                                                                                   // 186
              }  // EO for                                                                                          // 187
						} // EO restart handling failed handlers?                                                                     // 188
					} // EO No fileRecord found                                                                                    // 189
                                                                                                                    // 190
					__filehandlers.Running--;                                                                                      // 191
				} // EO Filehandler                                                                                             // 192
                                                                                                                    // 193
				if (__filehandlers.waitBeforeCheckingQueue) {                                                                   // 194
          Meteor.setTimeout(function() { self.checkQueue(); },                                                      // 195
                  __filehandlers.waitBeforeCheckingQueue); //Wait a second 1000                                     // 196
        }                                                                                                           // 197
			} else {                                                                                                         // 198
				if (__filehandlers.waitBeforeCheckingQueueWhenNoFilehandlers) {                                                 // 199
          Meteor.setTimeout(function() { self.checkQueue(); },                                                      // 200
                  __filehandlers.waitBeforeCheckingQueueWhenNoFilehandlers);                                        // 201
          //Wait 5 second 5000                                                                                      // 202
        }                                                                                                           // 203
			}                                                                                                                // 204
		} //No collection?? cant go on..                                                                                  // 205
	}, //EO checkQueue                                                                                                 // 206
                                                                                                                    // 207
	workFileHandlers: function(fileRecord, fileHandlers) {                                                             // 208
		var self = this;                                                                                                  // 209
                                                                                                                    // 210
		//Retrive blob                                                                                                    // 211
		var blob = self.collectionFS.retrieveBuffer(fileRecord._id);                                                      // 212
                                                                                                                    // 213
		// If file is ready                                                                                               // 214
		if (blob && blob.length > 0) {                                                                                    // 215
			//do some work, execute user defined functions                                                                   // 216
			for (var func in fileHandlers) {                                                                                 // 217
				// Is filehandler allready found?                                                                               // 218
				var filehandlerFound = (fileRecord.fileHandler &&                                                               // 219
                fileRecord.fileHandler[func]);                                                                      // 220
                                                                                                                    // 221
				// Set sum of filehandler failures - if not found the default to 0                                              // 222
				var sumFailes = (filehandlerFound &&                                                                            // 223
                fileRecord.fileHandler[func].failed)?                                                               // 224
                fileRecord.fileHandler[func].failed : 0;                                                            // 225
				// if not filehandler or filehandler found in fileRecord. fileHandlers                                          // 226
        // then check if failed                                                                                     // 227
				if (! filehandlerFound ||                                                                                       // 228
                ( sumFailes && sumFailes < __filehandlers.MaxFailes) ) {                                            // 229
                                                                                                                    // 230
					// destination - a helper for the filehandlers                                                                 // 231
					// [newExtension] is optional and with/without a leading '.'                                                   // 232
					// Returns                                                                                                     // 233
					// serverFilename - where the filehandler can write the file if wanted                                         // 234
					// fileData - contains future url reference and extension for the                                              // 235
					// database                                                                                                    // 236
          // TODO: destination should somehow be added to server-side                                               // 237
          // fileobject api - Look in top of this file                                                              // 238
					var destination = function(newExtension) {                                                                     // 239
						// Make newExtension optional, fallback to fileRecord.filename                                                // 240
						var extension = (newExtension)?                                                                               // 241
                    newExtension : path.extname(fileRecord.filename);                                               // 242
						// Remove optional leading '.' from extension name                                                            // 243
						extension = (extension.substr(0, 1) === '.')?                                                                 // 244
                    extension.substr(1) : extension;                                                                // 245
						// Construct filename from '_id' filehandler name and extension                                               // 246
						var myFilename = fileRecord._id + '_' + func + '.' + extension;                                               // 247
						// Construct url TODO: Should URL encode (could cause trouble in                                              // 248
            // the remove observer)                                                                                 // 249
						var myUrl = self.pathURL + '/' + myFilename;                                                                  // 250
                                                                                                                    // 251
						return {                                                                                                      // 252
							serverFilename: path.join(self.serverPath, myFilename),                                                      // 253
							fileData: {                                                                                                  // 254
								url: myUrl,                                                                                                 // 255
								extension: extension.toLowerCase()                                                                          // 256
							}                                                                                                            // 257
						};                                                                                                            // 258
					}; // EO destination                                                                                           // 259
                                                                                                                    // 260
					// We normalize filehandler data preparing it for the database                                                 // 261
					// func is the filehandler eg. "resize256"                                                                     // 262
					// fileData is the data to return from the file handler, eg. url and                                           // 263
          // extension                                                                                              // 264
					var normalizeFilehandle = function(func, fileData) {                                                           // 265
						var myData = {};                                                                                              // 266
						myData['fileHandler.'+func] = (fileData)?fileData:{};                                                         // 267
						myData['fileHandler.'+func].createdAt = Date.now();                                                           // 268
						return myData;                                                                                                // 269
					};                                                                                                             // 270
                                                                                                                    // 271
          var result = false;                                                                                       // 272
					try {                                                                                                          // 273
            // TODO: set `this` to file object                                                                      // 274
						result = fileHandlers[func]({                                                                                 // 275
              fileRecord: fileRecord,                                                                               // 276
              blob: blob,                                                                                           // 277
              destination: destination,                                                                             // 278
              sumFailes: sumFailes                                                                                  // 279
            });                                                                                                     // 280
					} catch(e) {                                                                                                   // 281
						throw new Error('Error in filehandler: "' + func + '" ' +                                                     // 282
                    (e.trace || e.message));                                                                        // 283
					}                                                                                                              // 284
                                                                                                                    // 285
					if (result) { //A result means do something for user defined function                                          // 286
						//Save on filesystem                                                                                          // 287
						if (result.blob) {                                                                                            // 288
							//save the file and update fileHandler                                                                       // 289
                                                                                                                    // 290
							fs.writeFileSync(destination(result.extension).serverFilename,                                               // 291
                      result.blob);                                                                                 // 292
                                                                                                                    // 293
							//Add to fileHandler array                                                                                   // 294
							if (fs.existsSync(destination(result.extension).serverFilename)) {                                           // 295
								self.collectionFS.files.update({ _id: fileRecord._id }, {                                                   // 296
									$set: normalizeFilehandle(func,                                                                            // 297
                          destination(result.extension).fileData)                                                   // 298
								}); //EO Update                                                                                             // 299
							} else {                                                                                                     // 300
								// File could not be written to filesystem? Don't try this                                                  // 301
                // filehandler again                                                                                // 302
								self.collectionFS.files.update({ _id: fileRecord._id }, {                                                   // 303
									$set: normalizeFilehandle(func,                                                                            // 304
                    { error: 'Filehandler could not write to filesystem' })                                         // 305
								}); //EO Update                                                                                             // 306
                                                                                                                    // 307
								throw new Error('Filehandler "' + func +                                                                    // 308
                        '" could not write to filesystem');                                                         // 309
							}                                                                                                            // 310
                                                                                                                    // 311
						} else {                                                                                                      // 312
                                                                                                                    // 313
							//no blob? Just save result as filehandler data                                                              // 314
							self.collectionFS.files.update({ _id: fileRecord._id }, {                                                    // 315
								$set: normalizeFilehandle(func, result)                                                                     // 316
							}); //EO Update                                                                                              // 317
                                                                                                                    // 318
						} //EO no blob                                                                                                // 319
					} else {  //Otherwise guess filehandler wants something else?                                                  // 320
						if (result === null) {                                                                                        // 321
                                                                                                                    // 322
							//if null returned then ok, dont run again - we update the db                                                // 323
							self.collectionFS.files.update({ _id: fileRecord._id }, {                                                    // 324
								$set: normalizeFilehandle(func)                                                                             // 325
							}); //EO Update                                                                                              // 326
                                                                                                                    // 327
						} else { // But if false then we got an error - handled by the queue                                          // 328
                                                                                                                    // 329
							// Do nothing, try again sometime later defined by config policy                                             // 330
							self.collectionFS.files.update({ _id: fileRecord._id }, {                                                    // 331
								$set: normalizeFilehandle(func, { failed: (sumFailes+1) })                                                  // 332
							}); //EO Update                                                                                              // 333
                                                                                                                    // 334
						}//EO filehandling failed                                                                                     // 335
					} //EO no result                                                                                               // 336
                                                                                                                    // 337
				} // EO if allready found or max failures reached                                                               // 338
			} //EO Loop through fileHandler functions                                                                        // 339
    } // EO if                                                                                                      // 340
    //Update fileHandler in db                                                                                      // 341
    self.collectionFS.files.update({ _id: fileRecord._id },                                                         // 342
            { $set: { handledAt: Date.now() } });                                                                   // 343
	}, //EO workFileHandlers                                                                                           // 344
	workLoadRemoteFile: function(fileRecord) {                                                                         // 345
		// Read remoteFile address and go fetch the remote file...                                                        // 346
		// TODO: Maybe allow for setting of a header / auth etc. ?                                                        // 347
		throw new Error('Serverside file fetching not implemented');                                                      // 348
	}                                                                                                                  // 349
});//EO queueListener extend                                                                                        // 350
                                                                                                                    // 351
                                                                                                                    // 352
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_server.api.js                                                                 //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
_.extend(CollectionFS.prototype, {                                                                                  // 3
	storeBuffer: function(filename, buffer, options) {                                                                 // 4
                                                                                                                    // 5
		// Check filename                                                                                                 // 6
		if (!filename || filename !== ''+filename ) {                                                                     // 7
      throw new Error('storeBuffer requires filename ' +                                                            // 8
              'string as first parametre');                                                                         // 9
    }                                                                                                               // 10
                                                                                                                    // 11
		// Check buffer                                                                                                   // 12
		if (!buffer || buffer.length < 1) {                                                                               // 13
      throw new Error('storeBuffer requires a Buffer as second parametre');                                         // 14
    }                                                                                                               // 15
                                                                                                                    // 16
		var self = this;                                                                                                  // 17
		var fileId = null;                                                                                                // 18
                                                                                                                    // 19
		// Set encoding for file                                                                                          // 20
		var encoding = (options && options.encoding) ? options.encoding : 'utf-8';                                        // 21
                                                                                                                    // 22
		// Simulate clienside file keys                                                                                   // 23
		var file = {                                                                                                      // 24
			name: filename,                                                                                                  // 25
			size: buffer.length,                                                                                             // 26
			encoding: encoding,                                                                                              // 27
			type: (options && options.contentType)? options.contentType : '',                                                // 28
			owner: (options && options.owner)? options.owner : ''                                                            // 29
		};                                                                                                                // 30
		var metadata = (options && options.metadata)?options.metadata : null;                                             // 31
                                                                                                                    // 32
		// Generate new fileRecord                                                                                        // 33
		var fileRecord = self.queue.makeGridFSFileRecord(file, metadata);                                                 // 34
                                                                                                                    // 35
		// Insert file record into database                                                                               // 36
		fileId = self.files.insert(fileRecord);                                                                           // 37
                                                                                                                    // 38
		// Check that we are ok                                                                                           // 39
		if (!fileId) {                                                                                                    // 40
      throw new Error('storeBuffer could not create file "' + filename +                                            // 41
              '" in database');                                                                                     // 42
    }                                                                                                               // 43
                                                                                                                    // 44
    //Put file in upload queue                                                                                      // 45
		for (var n = 0; n < fileRecord.countChunks; n++) {                                                                // 46
                                                                                                                    // 47
			// Handle each chunk                                                                                             // 48
			var data = buffer.toString(encoding, (n * fileRecord.chunkSize),                                                 // 49
              ( (n * fileRecord.chunkSize) + (fileRecord.chunkSize)) );                                             // 50
                                                                                                                    // 51
			// Save data chunk into database                                                                                 // 52
			var cId = self.chunks.insert({                                                                                   // 53
				"files_id" : fileId, // _id of the corresponding files collection entry                                         // 54
        "n" : n, // chunks are numbered in order, starting with 0                                                   // 55
				"data" : data // the chunk's payload as a BSON binary type                                                      // 56
			});                                                                                                              // 57
                                                                                                                    // 58
			// Check that we are okay                                                                                        // 59
			if (!cId) {                                                                                                      // 60
        throw new Error('storeBuffer can not create chunk ' + n + ' in file ' +                                     // 61
                filename);                                                                                          // 62
      }                                                                                                             // 63
                                                                                                                    // 64
      // Update progress or just when completed, use option.noProgress to change                                    // 65
			if (! (options && options.noProgress === true) ||                                                                // 66
              n === fileRecord.countChunks - 1) {                                                                   // 67
        self.files.update({ _id: fileId }, { $set: {                                                                // 68
          currentChunk: n,                                                                                          // 69
          numChunks: n+1,                                                                                           // 70
          complete: (n === fileRecord.countChunks - 1)                                                              // 71
        } });                                                                                                       // 72
      }                                                                                                             // 73
		} // EO chunk iteration                                                                                           // 74
                                                                                                                    // 75
		// Return the newly created file id                                                                               // 76
		return fileId;                                                                                                    // 77
	}, // EO storeBuffer                                                                                               // 78
                                                                                                                    // 79
	retrieveBuffer: function(fileId) {                                                                                 // 80
		if (!fileId) {                                                                                                    // 81
      throw new Error('retrieveBuffer require a file id as parametre');                                             // 82
    }                                                                                                               // 83
		// Load file from database                                                                                        // 84
		var self = this;                                                                                                  // 85
                                                                                                                    // 86
		// Get file file record                                                                                           // 87
		var fileRecord = self.files.findOne({ _id: fileId });                                                             // 88
		if (!fileRecord) {                                                                                                // 89
      throw new Error('retrieveBuffer can not find file on id: ' + fileId);                                         // 90
    }                                                                                                               // 91
		// Check if file is ready / a uploadDate                                                                          // 92
    // TODO: clean up remove complete from fileRecord                                                               // 93
		if (!fileRecord.uploadDate || !fileRecord.countChunks ||                                                          // 94
              fileRecord.numChunks !== fileRecord.countChunks) {                                                    // 95
      return;                                                                                                       // 96
    }                                                                                                               // 97
		// Note: Newer fileRecords should have an encoding specified                                                      // 98
		// but this helps maintain backward compatibility                                                                 // 99
		var encoding = (fileRecord.encoding) ? fileRecord.encoding : 'utf-8';                                             // 100
                                                                                                                    // 101
		// Get size of blob                                                                                               // 102
		var fileSize = +fileRecord['length']; //+ Due to Meteor issue                                                     // 103
                                                                                                                    // 104
		//Allocate mem                                                                                                    // 105
		var blob = new Buffer(fileSize, encoding);                                                                        // 106
                                                                                                                    // 107
		// Try to get all the chunks                                                                                      // 108
		var query = self.chunks.find({ files_id: fileId }, { sort: {n: 1} });                                             // 109
                                                                                                                    // 110
		//                                                                                                                // 111
		if (query.count() === 0) {                                                                                        // 112
			// A completed file with no chunks is corrupted, remove                                                          // 113
			if ( fileRecord.complete ) {                                                                                     // 114
        self.remove({ _id: fileId });                                                                               // 115
      }                                                                                                             // 116
			return;                                                                                                          // 117
		} // EO No chunks in file                                                                                         // 118
                                                                                                                    // 119
		query.rewind();                                                                                                   // 120
                                                                                                                    // 121
		// Create the file blob for the filehandlers to use                                                               // 122
		query.forEach(function(chunk){                                                                                    // 123
			if (! chunk.data ) {                                                                                             // 124
				// Somethings wrong, we'll throw an error                                                                       // 125
				throw new Error('Filehandlers for file id: ' + fileId +                                                         // 126
                ' got empty data chunk.n:' + chunk.n);                                                              // 127
      }                                                                                                             // 128
                                                                                                                    // 129
			// Write chunk data to blob using the given encoding                                                             // 130
			// if(chunk.data.length > 0) {                                                                                   // 131
			// blob.write(chunk.data, (chunk.n * fileRecord.chunkSize),                                                      // 132
      //        chunk.data.length, encoding);                                                                       // 133
      // }                                                                                                          // 134
			// Finally do the data appending                                                                                 // 135
			for (var i = 0; i < chunk.data.length; i++) {                                                                    // 136
				blob[(chunk.n * fileRecord.chunkSize) + i] = chunk.data.charCodeAt(i);                                          // 137
				//blob.writeUInt8( ((chunk.n * fileRecord.chunkSize) + i),                                                      // 138
        //        chunk.data.charCodeAt(i) );                                                                       // 139
      }                                                                                                             // 140
		}); //EO find chunks                                                                                              // 141
                                                                                                                    // 142
		return blob;                                                                                                      // 143
	} // EO retrieveBuffer                                                                                             // 144
});                                                                                                                 // 145
                                                                                                                    // 146
_.extend(_queueCollectionFS.prototype, {                                                                            // 147
	addFile: function(fileId, buffer) {                                                                                // 148
		// Load buffer chunks into chunks for fileId                                                                      // 149
	},                                                                                                                 // 150
	getFile: function(fileId) {                                                                                        // 151
		// Load chunks into                                                                                               // 152
                                                                                                                    // 153
	}                                                                                                                  // 154
});                                                                                                                 // 155
                                                                                                                    // 156
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function () {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/collectionFS/collectionFS_server.api.fileobject.js                                                      //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
"use strict";                                                                                                       // 1
                                                                                                                    // 2
/*                                                                                                                  // 3
  SERVER API                                                                                                        // 4
                                                                                                                    // 5
  The fileObject is equal to the fileRecord + server-side api                                                       // 6
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
  // TODO: Add server file object api                                                                               // 18
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
