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
		self.que = new _queCollectionFS(name);
		self._options = { autopublish: true };
		_.extend(self._options, options);

		//Auto subscribe
		if (self._options.autopublish)
			Meteor.subscribe(self._name+'.files');

		//var queListener = null; //If on client

		// __meteor_runtime_config__.FILEHANDLER_SUPPORTED;

	}; //EO collectionFS

	_queCollectionFS = function(name) {
		var self = this;
		self._name = name;
		self.que = {};
		self.fileDeps  = new Deps.Dependency;
		self.connection = Meteor.connect(Meteor.default_connection._stream.rawUrl);
		self.queLastTime = {};			//Deprecate
		self.queLastTimeNr = 0;			//Deprecate
		self.chunkSize = 1024; //256; //gridFS default is 256 1024 works better
		self.spawns = 10;				//0 = we dont spawn into "threads", 1..n = we spawn multiple "threads"
		self.paused = false;
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
		update: function(selector, modifier, options) { return this.files.update(selector, modifier, options); },
    	remove: function(selector) { return this.files.remove(selector); },
		allow: function(arguments) { return this.files.allow(arguments); },
		deny: function(arguments) { return this.files.deny(arguments); },
		fileHandlers: function(options) { /* NOP */}
	});


	_.extend(_queCollectionFS.prototype, {

		compareFile: function(fileRecordA, fileRecordB) {
			var errors = 0;
			var leaveOutField = {'_id':true, 'uploadDate':true, 'currentChunk':true, 'fileURL': true };
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
			  fileURL:[], //filled with file links - if fileHandler supply any
			  md5 : null,
			  complete : false,
			  currentChunk: -1,
			  owner: Meteor.userId(),
			  countChunks: countChunks,
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
