/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 * 
 * By Morten N.O. Henriksen, http://gi2.dk
 * 
 */

var fs = Npm.require('fs');
var path = Npm.require('path');

CollectionFS = function(name, options) {
	var self = this;
	self._name = name;
	self.files = new Meteor.Collection(self._name+'.files'); 	// TODO: Add change listener?
	self.chunks = new Meteor.Collection(self._name+'.chunks');
	self.queue = new _queueCollectionFS(name);
	self._fileHandlers = {}; 									// Set by function fileHandlers({});
        self._filter = null; 									// Set by function filter({});
	var methodFunc = {};										// Server methods
	
	serverConsole.log('CollectionFS: ' + name);

	// Extend _options
	self._options = { autopublish: true, maxFilehandlers: __filehandlers.MaxRunning };
	_.extend(self._options, options);
        
        //events
        self._events = {
          'ready': function() {},
          'invalid': function() {}, //arg1 = CFSErrorType enum, arg2 = fileRecord
          'progress': function() {}, //arg1 = progress percentage as integer
          'start': function() {},
          'stop': function() {},
          'resume': function() {}
        };

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
				});

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
					if (!self.chunks.findOne({ files_id: fileRecord._id, n: cnr}, { fields: { data:0 }})) {
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

	// Add object specific server methods
	Meteor.methods(methodFunc);

	//Init queueListener for fileHandling at the server
	Meteor.startup(function () {
		//Ensure chunks index on files_id and n
		self.chunks._ensureIndex({ files_id: 1, n: 1 }, { unique: true });
		//Spawn queue listener
		self.queueListener = new _queueListener(self);

		// Add observer removed
	    self.files.find(arguments, options).observe({
	        removed: function(doc) {
	            // remove all chunks, make sure _id isset, don't mess up
	            if (doc._id)
	            	self.chunks.remove({ files_id: doc._id });
	            // Check to se if any filehandlers worked the file
	            if (Object.keys(doc.fileHandler).length > 0) {
	            	// Walk through the filehandlers
		            _.each(doc.fileHandler, function(fileHandler, func) {
		            	// If url isset and beginning with '/' we have a local file?
		            	if (fileHandler.url && fileHandler.url.substr(0, 1) == '/') {
		            		// Reconstruct local absolute path to file
		            		var myServerPath = path.join(__filehandlers.rootDir, fileHandler.url.substr(1));
		            		// If file exists then
		            		if (!!fs.existsSync(myServerPath) ){
			            		try {
			            			// Remove the file
			            			fs.unlinkSync(myServerPath);
			            		} catch(e) { /* NOP */ }
			            	} // EO fileexists
		            	} // Local file
		            }); // EO each
		        } // EO fileHandler's found
	        } // EO removed
	    }); // EO Observer

	}); // Startup

}; //EO collectionFS

_queueCollectionFS = function(name) {
	var self = this;
	self._name = name;
};