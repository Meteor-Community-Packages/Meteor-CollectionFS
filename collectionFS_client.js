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
		//self.chunks = new Meteor.Collection(self._name+'.chunks');
		self.queue = new _queueCollectionFS(name);
		self._options = { autopublish: true };
		_.extend(self._options, options);

		//Auto subscribe
		if (self._options.autopublish)
			Meteor.subscribe(self._name+'.files');

		//var queueListener = null; //If on client

		// __meteor_runtime_config__.FILEHANDLER_SUPPORTED;

	}; //EO collectionFS

	_queueCollectionFS = function(name) {
		var self = this;
		self._name = name;
		self.queue = {};
		self.fileDeps  = new Deps.Dependency; // TODO: These deps could be finetuned to single files
		self.connection = Meteor.connect(Meteor.default_connection._stream.rawUrl);
		self.chunkSize = 256 * 1024;    //gridFS default is 256kb = 262.144bytes
		self.spawns = 0;				//0 = we dont spawn into "threads", 1..n = we spawn multiple "threads"
		self.paused = false;
	};

	_.extend(CollectionFS.prototype, {
		find: function(arguments, options) { return this.files.find(arguments, options); },
		findOne: function(arguments, options) { return this.files.findOne(arguments, options); },
		update: function(selector, modifier, options) { return this.files.update(selector, modifier, options); },
    	remove: function(selector) { return this.files.remove(selector); },
		allow: function(arguments) { return this.files.allow(arguments); },
		deny: function(arguments) { return this.files.deny(arguments); },
		fileHandlers: function(options) { /* NOP */ }
	});


	_.extend(_queueCollectionFS.prototype, {

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
		makeGridFSFileRecord: function(file, options) {
			var self = this;
			var countChunks = Math.ceil(file.size / self.chunkSize);
			return {
			  chunkSize : self.chunkSize,
			  uploadDate : Date.now(),
			  handledAt: null, //set by server when handled
			  fileHandler: {}, //filled with -> filehandlerName : { fileHandler custom result data }
			  md5 : null,
			  complete : false,
			  currentChunk: -1,
			  owner: Meteor.userId(),
			  countChunks: countChunks,
			  numChunks: 0,
			  filename : file.name,
			  length: ''+file.size, //Issue in Meteor, when solved dont use ''+
//			  len: file.size,
			  contentType : file.type,
			  metadata : (options) ? options : null
			};
			//TODO:
			//XXX: Implement md5 later, guess every chunk should have a md5...
			//XXX:checkup on gridFS date format
			//ERROR: Minimongo error/memory leak? when adding attr. length to insert object
			//length : Meteor _.each replaced with for in, in set function livedata server
		} //EO makeGridFSFileRecord
	});
