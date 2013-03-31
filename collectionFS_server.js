/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 * 
 * By Morten N.O. Henriksen, http://gi2.dk
 * 
 */
	CollectionFS = function(name, options) {
		var self = this;
		self._name = name;
		self.files = new Meteor.Collection(self._name+'.files'); //TODO: Add change listener?
		self.chunks = new Meteor.Collection(self._name+'.chunks');
		self._fileHandlers = null; //Set by function fileHandlers({});
		
		myLog('CollectionFS: ' + name);

		self._options = { autopublish: true, maxFilehandlers: __filehandlersMax };
		_.extend(self._options, options);

		__filehandlersMax = self._options.maxFilehandlers;

		if (self._options.autopublish) {
		  Meteor.publish(self._name+'.files', function () {
		    return self.find({});
		  }, {is_auto: true});		
		} //EO Autopublish

		var methodFunc = {};

		methodFunc['saveChunck'+self._name] = function(fileId, chunkNumber, countChunks, data) {
			this.unblock();
			var complete = (chunkNumber == countChunks - 1);
			var updateFiles = (chunkNumber  == 0); //lower db overheat on files record. eg. chunkNumber % 100 == 0
			var cId = null;
			var result = null;
			if (Meteor.isServer && fileId) {
				var startTime = Date.now();
				//console.log('inserts chunk: '+ chunkNumber);	//ERROR: two chunks with same nr....
				cId = self.chunks.insert({
					//"_id" : <unspecified>,    // object id of the chunk in the _chunks collection
					"files_id" : fileId,    	// _id of the corresponding files collection entry
					"n" : chunkNumber,          // chunks are numbered in order, starting with 0
					"data" : data          	// the chunk's payload as a BSON binary type			
				});

				/* Improve chunk index integrity have a look at TODO in uploadChunk() */
				if (cId) { //If chunk added successful
					/*console.log('update: '+self.files.update({_id: fileId}, { $inc: { currentChunk: 1 }}));
					result = self.files.findOne({_id: fileId});
					console.log('Server wants chunk nr: '+result.currentChunk+'  for file: ' + fileId);
					if (complete) {
						//TODO: Check integrity from server or via client?
						self.files.update({_id: fileId}, { $set: { complete: true }});
					} //EO check*/

					var numChunks = self.chunks.find({ "files_id": fileId }).count();

					if (complete || updateFiles)  //update file status
						self.files.update({ _id: fileId }, { 
							$set: { complete: complete, currentChunk: chunkNumber+1, numChunks: numChunks }
						})
					else
						self.files.update({ _id: fileId }, { 
							$set: { currentChunk: chunkNumber+1, numChunks: numChunks }
						});
					//** Only update currentChunk if not complete? , complete: {$ne: true}
				} //If cId
			} //EO isServer

			return { fileId: fileId, chunkId: cId, complete: complete, currentChunk: chunkNumber+1, time: (Date.now()-startTime)};
			//console.log('Return currentChunk: '+result.currentChunk);
			//return { fileId: fileId, chunkId: cId, complete: complete, currentChunk: result.currentChunk, time: (Date.now()-startTime)};
		}; //EO saveChunck+name

		methodFunc['loadChunck'+self._name] = function(fileId, chunkNumber, countChunks) {
			this.unblock();
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
				//console.log('Read: '+chunkNumber+' complete: '+complete);
				return { fileId: fileId, chunkId: chunk._id, currentChunk:chunkNumber, complete: complete, data: chunk.data, time: (Date.now()-startTime) };
			} //EO isServer
		}; //EO saveChunck+name

		methodFunc['getMissingChunk'+self._name] = function(fileId) {
			//console.log('getMissingChunk: '+fileRecord._id);
			var self = this;
			var fileRecord = self.files.findOne({_id: fileId});
			if (!fileRecord)
				throw new Error('getMissingChunk file not found: ' + fileId);
			//Check file chunks if they are all there
			//Return missing chunk id
			if (fileRecord.currentChunk == fileRecord.countChunks) { //Ok
				if (Meteor.isServer) {
					for (var cnr = 0; cnr < fileRecord.countChunks;cnr++) {
						//Really? loop though all chunks? cant mongo or gridFS do this better? 
						if (!self.chunks.findOne({ n: cnr}, { fields: { data:0 }})) {
							//File error - missing chunks..
							return cnr; //Return cnr that is missing
						}
					}
					return false; //Checked and good to go (need md5?)
				} else {
					return false; //client only, cant access .chunks collection from client, could be really big files
				}
			} else {
				return fileItem.currentChunk;  //return missing chunk to continue - fileupload not complete
			}
		}; //EO getMissingChunk



		Meteor.methods(methodFunc); //EO Meteor.methods

		// Filehanders are started here when on the server, there are spawned one
		// que listener pr. collectionFS used in app, but only if collection has
		// fileHanders defined will que listener be active. If no fileHandlers 
		// defined the que listener will scale down and wait for fileHandlers to
		// be defined.
		// If fileHandlersFileWrite false then que listeners will still be spawned 
		// though the system doesnt support file handler writing, making it
		// impossible to cache to harddrive - though a filehandler could be used
		// for other purposes eg. sending mail notifications or upload file to 
		// remote host.
		// 
		var queListener = null; //If on client
		//Init queListener for fileHandling at the server
		Meteor.startup(function () {
			//Ensure index on files_id and n
			self.chunks._ensureIndex({ files_id: 1, n: 1 }, { unique: true });
			//Spawn que listener
			self.queListener = new _queListener(self);
		});

	}; //EO collectionFS

	Meteor.methods({
	  returnFileHandlerSupport: function () {
	    return {_fileHandlersSupported: _fileHandlersSupported, _fileHandlersSymlinks: _fileHandlersSymlinks, _fileHandlersFileWrite:_fileHandlersFileWrite};
	  }
	});

	_.extend(CollectionFS.prototype, {
		find: function(arguments, options) { 
			var self = this;
		    var query = self.files.find(arguments, options);
		    var handle = query.observe({
		        removed: function(doc) {
		        	//console.log('Removing: '+doc.filename);
		            // remove all chunks
		            self.chunks.remove({ files_id: doc._id });
		            // remove all files related *( delete each fileUrl path begins with '/' )*
		            if (doc.fileURL.length > 0) {
		            	var fs = npm.require('fs');
			            _.each(doc.fileURL, function(fileURL) {
				        	//console.log('Remove cache: '+fileURL.path);
			            	if (fileURL.path && fileURL.path.substr(0, 1) == '/') {
			            		var myServerPath = __filehandlers.rootDir + '' + fileURL.path.substr(1);
			            		if (!!fs.existsSync(myServerPath) ){
				            		try {
				            			fs.unlinkSync(myServerPath);
				            		} catch(e) { /* NOP */ }
				            	} // EO fileexists
			            	} // Local file
			            }); // EO each
			        } // EO fileURL's found
		        } // EO removed
		    }); // EO Observer
	        handle.stop;
		    return query;
		},
		findOne: function(arguments, options) { return this.files.findOne(arguments, options); },
		update: function(selector, modifier, options) { return this.files.update(selector, modifier, options); },
    	remove: function(selector) { return this.files.remove(selector); },
		allow: function(arguments) { return this.files.allow(arguments); },
		deny: function(arguments) { return this.files.deny(arguments); },
		fileHandlers: function(options) {
			var self = this;
			self._fileHandlers = options; // fileHandlers({ handler['name']: function() {}, ... });
		}
	});
