/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 * 
 * By Morten N.O. Henriksen, http://gi2.dk
 * 
 */

var fs = npm.require('fs');
var path = npm.require('path');

CollectionFS = function(name, options) {
	var self = this;
	self._name = name;
	self.files = new Meteor.Collection(self._name+'.files'); 	// TODO: Add change listener?
	self.chunks = new Meteor.Collection(self._name+'.chunks');
	self._fileHandlers = null; 									// Set by function fileHandlers({});
	var methodFunc = {};										// Server methods
	
	myLog('CollectionFS: ' + name);

	// Extend _options
	self._options = { autopublish: true, maxFilehandlers: __filehandlers.MaxRunning };
	_.extend(self._options, options);

	// User is able to set maxFilehandlers - could be other globals to if needed
	__filehandlers.MaxRunning = self._options.maxFilehandlers;

	// Setup autopublish if not flag'ed out
	if (self._options.autopublish) {
	  Meteor.publish(self._name+'.files', function () {
	    return self.find({});
	  }, {is_auto: true});		
	} //EO Autopublish

	// Save data into file in collection
	methodFunc['saveChunck'+self._name] = function(fileId, chunkNumber, countChunks, data) {
		this.unblock();
		if ( fileId ) {

			var cId = self.chunks.insert({
				"files_id" : fileId,    	// _id of the corresponding files collection entry
				"n" : chunkNumber,          // chunks are numbered in order, starting with 0
				"data" : data          		// the chunk's payload as a BSON binary type			
			});

			if (cId) { //If chunk added successful
				var numChunks = self.chunks.find({ "files_id": fileId }).count();

				self.files.update({ _id: fileId }, { 
					$set: { complete: (countChunks == numChunks), currentChunk: chunkNumber+1, numChunks: numChunks }
				})

				return { 
					fileId: fileId, 
					chunkId: cId, 
					complete: (countChunks == numChunks), 
					currentChunk: chunkNumber+1
				};

			} //If cId
		} //EO got fileId
	}; //EO saveChunck+name

	// Return requested data from chunk in file
	methodFunc['loadChunck'+self._name] = function(fileId, chunkNumber, countChunks) {
		this.unblock();
		if ( fileId ) {
			var chunk = self.chunks.findOne({
				"files_id" : fileId,    	// _id of the corresponding files collection entry
				"n" : chunkNumber          // chunks are numbered in order, starting with 0
			});

			return { 
				fileId: fileId, 
				chunkId: chunk._id, 
				currentChunk:chunkNumber, 
				complete: (chunkNumber == countChunks-1), 
				data: chunk.data
			};
		} //EO fileId
	}; //EO saveChunck+name

	methodFunc['getMissingChunk'+self._name] = function(fileId) {
		//console.log('getMissingChunk: '+fileRecord._id);
		var self = this;
		var fileRecord = self.files.findOne({_id: fileId});

		if (fileRecord) {
			//Check file chunks if they are all there
			//Return missing chunk id
			if (fileRecord.currentChunk == fileRecord.countChunks) { //Ok
				for (var cnr = 0; cnr < fileRecord.countChunks; cnr++) {
					//Really? loop though all chunks? cant mongo or gridFS do this better? TODO: Readup specs/docs
					if (!self.chunks.findOne({ n: cnr}, { fields: { data:0 }})) {
						//File error - missing chunks..
						return cnr; //Return cnr that is missing
					}
				}
				return false; //Checked and good to go (need md5?)
			} else {
				return fileItem.currentChunk;  //return missing chunk to continue - fileupload not complete
			}
		} else {
			// No fileRecord found
			throw new Error('getMissingChunk file not found: ' + fileId);
		}
	}; //EO getMissingChunk

	Meteor.methods(methodFunc); //EO Meteor.methods

	//Init queueListener for fileHandling at the server
	Meteor.startup(function () {
		//Ensure index on files_id and n
		self.chunks._ensureIndex({ files_id: 1, n: 1 }, { unique: true });
		//Spawn queue listener
		self.queueListener = new _queueListener(self);
	});

}; //EO collectionFS

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
	            if (doc.fileHandler.length > 0) {

		            _.each(doc.fileHandler, function(fileHandler) {
			        	//console.log('Remove cache: '+fileHandler.path);
		            	if (fileHandler.url && fileHandler.url.substr(0, 1) == '/') {
		            		var myServerPath = path.join(__filehandlers.rootDir, fileHandler.url.substr(1));
		            		if (!!fs.existsSync(myServerPath) ){
			            		try {
			            			fs.unlinkSync(myServerPath);
			            		} catch(e) { /* NOP */ }
			            	} // EO fileexists
		            	} // Local file
		            }); // EO each
		        } // EO fileHandler's found
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
