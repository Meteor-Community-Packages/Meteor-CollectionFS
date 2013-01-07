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
	self.que = new _queCollectionFS(name);

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
	methodFunc['saveChunck'+self._name] = function(fileId, chunkNumber, countChunks, data) {
		var complete = (chunkNumber == countChunks - 1);
		var updateFiles = true; //(chunkNumber % 100 == 0); //lower db overheat on files record. eg. chunkNumber % 100 == 0
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

}; //EO collectionFS

_queCollectionFS = function(name) {
	var self = this;
	self._name = name;
	self.que = {};
	self.queLastTime = {};
	self.queLastTimeNr = 0;
	self.chunkSize = 1024; //256; //gridFS default is 256
	self.spawns = 50;
	//self.paused = false;
	self.listeners = {};
	self.lastTimeUpload = null;
	self.lastCountUpload = 0;
	self.lastTimeDownload = null;
	self.lastCountDownload = 0;	
	self.myCounter = 0;
	self.mySize = 0;
};

_.extend(CollectionFS.prototype, {
	find: function(options, optOptions) { return this.files.find(options, optOptions); },
	findOne: function(options, optOptions) { return this.files.findOne(options, optOptions); },
	allow: function(options) { return this.files.allow(options); },
	deny: function(options) { return this.files.deny(options); }
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
		  md5 : null,
		  complete : false,
		  currentChunk: -1,
		  owner: Meteor.userId(),
		  countChunks: countChunks,
		  filename : file.name,
		  len : file.size,
		 // 'length': file.size,
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

