/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 * 
 * By Morten N.O. Henriksen, http://gi2.dk
 * 
 */

collectionFS = function(name, options) {
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

//var _queCollectionFS = {
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
