/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 * 
 * By Morten N.O. Henriksen, http://gi2.dk
 * 
 */
(function () {
	CollectionFS = function(name, options) {
		var self = this;
		self._name = name;
		self.files = new Meteor.Collection(self._name+'.files'); //TODO: Add change listener?
		self.chunks = new Meteor.Collection(self._name+'.chunks');
		self.que = new _queCollectionFS(name);
		self._fileHandlers = null; //Set by function fileHandlers({});

	//Auto subscribe
		if (Meteor.isClient) {
			Meteor.subscribe(self._name+'.files'); //TODO: needed if nullable?
		} //EO isClient	

		if (Meteor.isServer) {
		  Meteor.publish(self._name+'.files', function () { //TODO: nullable? autopublish?
		    return self.files.find({});
		  });		
		} //EO isServer

		var methodFunc = {};
		if (true) {
			methodFunc['saveChunck'+self._name] = function(fileId, chunkNumber, countChunks, data) {
				this.unblock();
				var complete = (chunkNumber == countChunks - 1);
				var updateFiles = (chunkNumber  == 0); //lower db overheat on files record. eg. chunkNumber % 100 == 0
				var cId = null;
				if (Meteor.isServer && fileId) {
					var startTime = Date.now();
					cId = self.chunks.insert({
						//"_id" : <unspecified>,    // object id of the chunk in the _chunks collection
						"files_id" : fileId,    	// _id of the corresponding files collection entry
						"n" : chunkNumber,          // chunks are numbered in order, starting with 0
						"data" : data,          	// the chunk's payload as a BSON binary type			
					});

					/* Improve chunk index integrity have a look at TODO in uploadChunk() */
					if (cId) { //If chunk added successful
						if (complete || updateFiles)  //update file status
							self.files.update({ _id:fileId }, { 
								$set: { complete: complete, currentChunk: chunkNumber+1 }
							})
						else
							self.files.update({ _id:fileId }, { 
								$set: { currentChunk: chunkNumber+1 }
							});
						//** Only update currentChunk if not complete? , complete: {$ne: true}
					} //If cId
				} //EO isServer
				return { fileId: fileId, chunkId: cId, complete: complete, currentChunk: chunkNumber+1, time: (Date.now()-startTime)};
			}; //EO saveChunck+name

			methodFunc['loadChunck'+self._name] = function(fileId, chunkNumber, countChunks) {
				var complete = (chunkNumber == countChunks-1);
				var chunk = null;
				if (Meteor.isServer && fileId) {
					var startTime = Date.now();
					chunk = self.chunks.findOne({
						//"_id" : <unspecified>,    // object id of the chunk in the _chunks collection
						"files_id" : fileId,    	// _id of the corresponding files collection entry
						"n" : chunkNumber          // chunks are numbered in order, starting with 0
						//"data" : data,          	// the chunk's payload as a BSON binary type			
					});

					return { fileId: fileId, chunkId: chunk._id, currentChunk:chunkNumber, complete: complete, data: chunk.data, time: (Date.now()-startTime) };
				} //EO isServer
			}; //EO saveChunck+name


			Meteor.methods(methodFunc); //EO Meteor.methods
		} //EO isServer

		var queListener = null; //If on client
		//Init queListener for fileHandling at the server
		if (Meteor.isServer) {
			Meteor.startup(function () {
				//Ensure index on files_id and n
				self.chunks._ensureIndex({ files_id: 1, n: 1 }, { unique: true });
				//Spawn que listener
				self.queListener = new _queListener(self);
			});
		}
		if (Meteor.isClient) {
			//check server _fileHandlersSupported
			//self.queListener.fsOk
			Meteor.startup(function () {
				Meteor.call('returnFileHandlerSupport', function(err, res) {
					Session.set('_fileHandlersSupported', (res._fileHandlersFileWrite && res._fileHandlersSymlinks));
					Session.set('_fileHandlersSymlinks', res._fileHandlersSymlinks);
					Session.set('_fileHandlersFileWrite', res._fileHandlersFileWrite);					
				}); //EO call
			}); //EO startup 
		}

	}; //EO collectionFS

	if (Meteor.isServer) {
		Meteor.methods({
		  returnFileHandlerSupport: function () {
		    return {_fileHandlersSupported: _fileHandlersSupported, _fileHandlersSymlinks: _fileHandlersSymlinks, _fileHandlersFileWrite:_fileHandlersFileWrite};
		  }
		});
	}
	_queCollectionFS = function(name) {
		var self = this;
		self._name = name;
		self.que = {};
		self.queLastTime = {};			//Deprecate
		self.queLastTimeNr = 0;			//Deprecate
		self.chunkSize = 1024; //256; //gridFS default is 256 1024 works better
		self.spawns = 10;
		//self.paused = false;			//Deprecate
		self.listeners = {};			//Deprecate
		self.lastTimeUpload = null;		//Deprecate
		self.lastCountUpload = 0;		//Deprecate
		self.lastTimeDownload = null;	//Deprecate
		self.lastCountDownload = 0;		//Deprecate
		self.myCounter = 0;				//Deprecate
		self.mySize = 0;				//Deprecate
	};

	_.extend(CollectionFS.prototype, {
		find: function(arguments, options) { return this.files.find(arguments, options); },
		findOne: function(arguments, options) { return this.files.findOne(arguments, options); },
		allow: function(arguments) { return this.files.allow(arguments); },
		deny: function(arguments) { return this.files.deny(arguments); },
		getMissinChunk: function(fileRecord) {
			console.log('getMissinChunk: '+fileRecord._id);
			var self = this;
			//Check file chunks if they are all there
			//Return missing chunk id
			if (fileRecord.currentChunk == fileRecord.countChunks) { //Ok
				if (Meteor.isServer) {
					for (var cnr = 0; cnr < fileRecord.countChunks;cnr++) {
						//Really? loop though all chunks? cant mongo or gridFS do this better? 
						if (!self.chunks.findOne({ n: cnr}, { fields: { data:0 }})) {
							//File error - missing chunks..
							return cnr;
						}
					}
					return false; //Checked and good to go (need md5?)
				} else {
					return false; //client only, cant access .chunks collection from client, could be really big files
				}
			} else {
				return fileItem.currentChunk;  //return missing chunk - fileupload not complete
			}
		}, //EO getMissingChunk
		fileHandlers: function(options) {
			var self = this;
			self._fileHandlers = options; // fileHandlers({ handler['name']: function() {}, ... });
		}
	});


	_.extend(_queCollectionFS.prototype, {

		compareFile: function(fileRecordA, fileRecordB) {
			var errors = 0;
			var leaveOutField = {'_id':true, 'uploadDate':true, 'currentChunk':true };
			for (var fieldName in fileRecordA) {
				if (!leaveOutField[fieldName]) {
					if (fileRecordA[fieldName] != fileRecordB[fieldName]) {
						errors++; 
					}
				}
			} //EO for
			return (errors == 0);
		},
		makeGridFSFileRecord: function(file, options) {
			var self = this;
			var countChunks = Math.ceil(file.size / self.chunkSize);
			return {
			  chunkSize : self.chunkSize,
			  uploadDate : Date.now(),
			  handledAt: null, //set by server when handled
			  fileURL:[], //filled with file links - if fileHandler supply any
			  md5 : null,
			  complete : false,
			  currentChunk: -1,
			  owner: Meteor.userId(),
			  countChunks: countChunks,
			  filename : file.name,
			  len : file.size,
			 // 'length': file.size, //Issue in Meteor
			  contentType : file.type,
			  metadata : (options) ? options : null
			};
			//TODO:
			//XXX: Implement md5 later, guess every chunk should have a md5...
			//XXX:checkup on gridFS date format
			//ERROR: Minimongo error/memory leak? when adding attr. length to insert object
			//length : file.size,    gridFS size of the file in bytes, renamed ".len" to make it work?
		} //EO makeGridFSFileRecord
	});

})();//EO file

