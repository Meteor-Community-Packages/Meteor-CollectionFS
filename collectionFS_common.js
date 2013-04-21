// Make files basic functions available in CollectionFS
_.extend(CollectionFS.prototype, {
	find: function(arguments, options) { return this.files.find(arguments, options); },
	findOne: function(arguments, options) { return this.files.findOne(arguments, options); },
	update: function(selector, modifier, options) { return this.files.update(selector, modifier, options); },
	remove: function(selector) { return this.files.remove(selector); },
	allow: function(arguments) { return this.files.allow(arguments); },
	deny: function(arguments) { return this.files.deny(arguments); },
	fileHandlers: function(options) { this._fileHandlers = options; }
});

_.extend(_queueCollectionFS.prototype, {
	queue: {},
	chunkSize: 256 * 1024,    //gridFS default is 256kb = 262.144bytes
	compareFile: function(fileRecordA, fileRecordB) {
		var errors = 0;
		var leaveOutField = {'_id':true, 'uploadDate':true, 'currentChunk':true, 'fileHandler': true };
		for (var fieldName in fileRecordA) {
			if (!leaveOutField[fieldName]) {
				if (fileRecordA[fieldName] != fileRecordB[fieldName]) {
					errors++; 
					console.log(fieldName);
				}
			}
		} //EO for
		return (errors == 0);
	},
	makeGridFSFileRecord: function(file, metadata) {
		var self = this;
		var countChunks = Math.ceil(file.size / self.chunkSize);
		var userId = (Meteor.isClient)?
						( (this.userId) ? this.userId: Meteor.userId() ): file.owner;
		var encoding = (file.encoding && file.encoding != '') ? file.encoding : 'utf-8';

		return {
		  chunkSize : self.chunkSize,	// Default 256kb ~ 262.144 bytes
		  uploadDate : Date.now(),		// Client/Server set date
		  handledAt: null, 				// datetime set by Server when handled
		  fileHandler: {}, 				// fileHandler supplied data if any
		  md5 : null,					// Not yet implemented
		  complete : false,				// countChunks == numChunks
		  currentChunk: -1,				// Used to coordinate clients
		  owner: userId,
		  countChunks: countChunks,		// Expected number of chunks
		  numChunks: 0,					// number of chunks in database
		  filename : file.name,			// Original filename
		  length: ''+file.size, 		// Issue in Meteor, when solved dont use ''+
		  contentType : file.type,
		  encoding: encoding,			// Default 'utf-8'
		  metadata : (metadata) ? metadata : null // Custom data
		/* TODO:
		    startedAt: null,          // Start timer for upload start
		    endedAt: null,            // Stop timer for upload ended
		*/
		};
		// TODO: Implement md5 later, guess every chunk should have a md5...
		// TODO: checkup on gridFS date format
	} //EO makeGridFSFileRecord
});