//Server cache worker, idear:
//
//Basics
//On server load init worker and taskQue if needed by collection if (fileHandlers)
//When client confirms uploads run user defined functions on file described in fileHandlers
//if null returned then proceed to the next function in fileHandler array
//if data returned then put it in a file in eg.:  uploads/cfs/collection._name folder and update url array reference in database, triggers reactive update UI
//Note: updating files in uploads refreshes server? - find solution later, maybe patch meteor core?
//
//In model:
//CollectionFS.fileHandlers({
//  //Default image cache
//  handler['default']: function(fileId, blob) {
//    return blob;
//  },
//  //Some specific
//  handler['40x40']: function(fileId, blob) {
//     //Some serverside image/file handling functions, user can define this
//     return blob;
//   },
//  //Upload to remote server
//  handler['remote']: function(fileId, blob) {
//     //Some serverside imagick/file handling functions, user can define this
//     return null;
//   },
//   
// });
//
// Server:
// on startup queListener spawned if needed by collectionFS - one queListener pr collectionFS
// queListener spawns fileHandlers pr. item in fileHandlerQue as setTimeout(, 0) and delete item from que
// if empty que then die and wait, spawn by interval
// server sets .handledAt = Date.now(), .fileURL[]
// fileHandlers die after ended
// Filehandlers respect __filehandlersMax on server, set to 1 pr. default for throttling the server.
// 
// Client:
// When upload confirmed complete, set fs.files.complete and add _id to collectionFS.fileHandlerQue (wich triggers a worker at interval)
// 

//var queListener = new _queListener();

// Maximum number of filehandlers allowed
__filehandlersMax = 1;
__filehandlersRunning = 0;

 _queListener = function(collectionFS) {
		var self = this;
		self.collectionFS = collectionFS;
	    self.fs = npm.require('fs');

	    // Init directory for collection
		self.path = __filehandlers.serverPath + '/' + self.collectionFS._name;  // Server path
		self.pathURL = __filehandlers.url + '/' + self.collectionFS._name;   // Url path

		if (!fs.existsSync(self.path))
			fs.mkdirSync(self.path);

		self.pathCreated = (!!fs.existsSync(self.path));		

		//Spawn worker:
		Meteor.setTimeout(function() { self.checkQue(); }, 0); //Initiate worker process

	};//EO queListener

	_.extend(_queListener.prototype, {
		checkQue: function() {
			var self = this;
			//check items in que and init workers for conversion
			if (self.collectionFS) {
				if (self.collectionFS._fileHandlers) {
					//ok got filehandler object, spawn worker?
					if (__filehandlersRunning < __filehandlersMax) {
						__filehandlersRunning++;
						//Now, any news?					
						var fileRecord = self.collectionFS.findOne({ handledAt: null, complete: true }); //test currentChunk == countChunks in mongo?

						if (fileRecord) { //Handle file, spawn worker
							self.workFileHandlers(fileRecord, self.collectionFS._fileHandlers);
						}
						__filehandlersRunning--;
					} // EO Filehandler

					Meteor.setTimeout(function() { self.checkQue(); }, 1000); //Wait a second 1000	
				} else {
					Meteor.setTimeout(function() { self.checkQue(); }, 5000); //Wait 5 second 5000	
				}
			} //No collection?? cant go on..
		}, //EO checkQue

		workFileHandlers: function(fileRecord, fileHandlers) {
			var self = this;
			var fileURL = [];
			//Retrive blob
			var fileSize = ( fileRecord['len']||fileRecord['length']); //Due to Meteor issue
			var blob = new Buffer(1*fileSize); //Allocate mem *1 due to Meteor issue
			//var blob = new Buffer(fileRecord['length'], { type: fileRecord.contentType}); //Allocate mem
			var query = self.collectionFS.chunks.find({files_id: fileRecord._id}, { $sort: {n:1} });

			if (query.count() == 0) {
				// Somethings wrong, we'll update and skip 
				self.collectionFS.files.update({ _id: fileRecord._id }, { $push: { 
					fileURL: { error: 'Filehandlers failed, no chunks in file', handledAt: Date.now() }
				}}); //EO Update
				return;
			}
			query.rewind(); // TODO: Necessary?

			query.forEach(function(chunk){
				if (! chunk.data){
					// Somethings wrong, we'll update and skip 
					self.collectionFS.files.update({ _id: fileRecord._id }, { $push: { 
						fileURL: { error: 'Filehandlers failed, empty chunk data', handledAt: Date.now() }
					}}); //EO Update
					return;
				}

				for (var i=0; i < chunk.data.length; i++) {
					blob[(chunk.n * fileRecord.chunkSize) + i] = chunk.data.charCodeAt(i);
					//blob.writeUInt8( ((chunk.n * fileRecord.chunkSize) + i), chunk.data.charCodeAt(i) );
				}
			}); //EO find chunks

			//do some work, execute user defined functions
			for (var func in fileHandlers) {
				//TODO: check if func in fileRecord.fileURL...if so then skip 
				//if (func in fileRecord.fileURL[].func) next?

				// Add a helper for the filehandlers
				var destination = function(newExtension) {
					var extension = (newExtension)? newExtension : fileRecord.filename.substr(-3).toLowerCase();
					var myFilename = fileRecord._id+'_'+func+'.'+extension;
					var myPathURL = self.pathURL;

					return { serverPath: self.path+'/'+myFilename, fileURL: { path: myPathURL+'/'+myFilename, extension: extension} };
				};

				var result = false;
				try {
					result = fileHandlers[func]({ fileRecord: fileRecord, blob: blob, destination: destination });
				} catch(e) {
					throw new Error('Error in filehandler: "' + func + '" ' + (e.trace || e.message));
				}

				if (result) { //A result means do something for user defined function...
					//Save on filesystem
					if (result.blob) {
						//save the file and update fileURL
						var extension = (result.extension)?result.extension:result.fileRecord.filename.substr(-3).toLowerCase();
						var myFilename = result.fileRecord._id+'_'+func+'.'+extension;
						var myPathURL = self.pathURL;
	
						self.fs.writeFileSync(self.path+'/'+myFilename, result.blob, 'binary')
						//Add to fileURL array
						if (self.fs.existsSync(self.path+'/'+myFilename)) {
							self.collectionFS.files.update({ _id: fileRecord._id }, { $push: { 
								fileURL: { path: myPathURL+'/'+myFilename, extension: extension, createdAt: Date.now(), func: func }
							}}); //EO Update
						} //EO does exist						
					} else {
						//no blob? Just save result as an option?
						result.createdAt = Date.now();
						result.func = func;
						self.collectionFS.files.update({ _id: fileRecord._id }, { $push: { 
							fileURL: result
						}}); //EO Update
					} //EO no blob
				} else {  //Otherwise guess user did something else eg. upload to remote server
					if (result === null) { //if null returned then ok, but if false then error - handled by crawler 
						self.collectionFS.files.update({ _id: fileRecord._id }, { $push: { 
							fileURL: { createdAt: Date.now(), func: func }
						}}); //EO Update
					} else {
						//Do nothing, handled by crawler
					//	self.collectionFS.files.update({ _id: fileRecord._id }, { $push: { 
					//		fileURL: { error: 'User function '+func+' failed' }
					//	}}); //EO Update
					}//EO filehandling failed
				} //EO no result
				//console.log('function: '+func);
			} //EO Loop through fileHandler functions

			//TODO: Set handledAt: Date.Now() on files //maybe in the beginning of function?
	        //Update fileURL in db
	        self.collectionFS.files.update({ _id: fileRecord._id }, { $set: { handledAt: Date.now() } });
	        //TODO: maybe make some recovery / try again if a user defined handler fails - or force rerun from date. I'm thinking maybe just at followup interval function crawling a collection finding errors...

		}, //EO
		crawlAndRunFailedHandlersAgain: function() {
			//Do something smart, check up if fileURL contains createdAt && func = handlers (could be a new one that should be used on all or one that failed)
			//When fix error delete error from fileURL
			//self.workFileHandlers(fileRecord, self.collectionFS._fileHandlers);
			//Repeat
		}
	});//EO queListener extend

