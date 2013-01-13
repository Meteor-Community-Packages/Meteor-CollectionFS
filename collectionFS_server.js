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
// 
// Client:
// When upload confirmed complete, set fs.files.complete and add _id to collectionFS.fileHandlerQue (wich triggers a worker at interval)
// 


	//var queListener = new _queListener();
var _fileHandlersSupported = false;
var _fileHandlersSymlinks = true;
var _fileHandlersFileWrite = true;

 _queListener = function(collectionFS) {
		var self = this;
		self.collectionFS = collectionFS; //initialized collectionFS
		self.cfsMainFolder = 'uploads';
		self.path = self.cfsMainFolder+'/'+'cfs/'+self.collectionFS._name;
		self.pathURL = self.path;
		self.pathURLFallback = 'cfs/'+self.collectionFS._name;
		self.fs = __meteor_bootstrap__.require('fs');
		//Init path
		self.fs.mkdir(self.cfsMainFolder, function(err) {
			self.fs.mkdir(self.cfsMainFolder+'/cfs', function(err){
				self.fs.mkdir(self.path, function(err){
					//Workaround meteor server refresh, thanks SO dustin.b
				    self.fs.symlink('../../../../'+self.cfsMainFolder, '.meteor/local/build/static/'+self.cfsMainFolder, function(err){
					    self.fs.exists(self.path, function (exists) {
					    	_fileHandlersSupported = exists;
				    		console.log( (exists) ? 'Filesystem initialized':'Filehandling not supported, stops services' );
							console.log('Path: '+self.path);

					    }); //EO Exists
					    if (err) {
					    	_fileHandlersSymlinks = false;
					    	//Use 'public' folder instead of uploads
							self.cfsMainFolder = 'public';
							self.path = self.cfsMainFolder+'/'+'cfs/'+self.collectionFS._name;					    	
							self.fs.mkdir(self.cfsMainFolder, function(err) {
								self.fs.mkdir(self.cfsMainFolder+'/cfs', function(err){
									self.fs.mkdir(self.path, function(err){
										self.fs.exists(self.path, function (exists) {
											_fileHandlersSupported = exists;
											self.testFileWrite();
										});
									}); //collection
								});//EO cfs
							});//EO Main folder

					    } else { //EO symlink Error
					    	self.testFileWrite();
					    }
				    }); //EO symlink
				}); //EO self.collectionFS._name folder
			}); //EO cfs seperate collectionFS folder
		}); // EO self.cfsMainFolder folder

		//Init
		//console.log('Init _queListener: '+collectionFS._name);
		//Spawn worker:
		Meteor.setTimeout(function() { self.checkQue(); }, 0); //Initiate worker process

	};//EO queListener

	_.extend(_queListener.prototype, {
		testFileWrite: function() {
			var self = this;
			var myFile = self.cfsMainFolder+'/testFileWrite.txt';
			self.fs.writeFile(myFile, '123456789', Fiber(function(err) {
				//Add to fileURL array
				if (!err) {
					self.fs.exists(myFile, function (exists) {
						_fileHandlersFileWrite = exists;
					}); //EO Exists
				} 
			}).run()); //EO fileWrite				
		},
		checkQue: function() {
			var self = this;
			//check items in que and init workers for conversion
//console.log('_queListener.checkQue();');
//console.log('.'+Date.now());
			if (self.collectionFS) {
				if (self.collectionFS._fileHandlers) {
					//ok got filehandler object, spawn worker
					//Now, any news?
					var fileRecord = self.collectionFS.findOne({ handledAt: null, complete: true }); //test currentChunk == countChunks in mongo?
					if (fileRecord) { //Handle file, spawn worker
						//console.log('spawn');
						self.workFileHandlers(fileRecord, self.collectionFS._fileHandlers);
					}
					//Ready, Spawn new worker
					//if (_fileHandlersFileWrite) //do allways init filehandlers. could be used to other tings than save on disk
						Meteor.setTimeout(function() { self.checkQue(); }, 1000); //Wait a second 1000	
				} else {
					//No filehandlers added, wait 5 sec before Spawn new worker - nothing else to do yet
					//if (_fileHandlersFileWrite) //do allways init filehandlers. could be used to other tings than save on disk
						Meteor.setTimeout(function() { self.checkQue(); }, 5000); //Wait 5 second 5000	
				}
			} //No collection?? cant go on..
		}, //EO checkQue

		workFileHandlers: function(fileRecord, fileHandlers) {
			//var fs = __meteor_bootstrap__.require('fs');			
			var self = this;
			var fileURL = [];
			//Retrive blob
			var fileSize = ( fileRecord['len']||fileRecord['length']); //Due to Meteor issue
			console.log('filesize: '+fileSize+' recSize: '+fileRecord['length']);
			var blob = new Buffer(1*fileSize); //Allocate mem *1 due to Meteor issue
			//var blob = new Buffer(fileRecord['length'], { type: fileRecord.contentType}); //Allocate mem

			self.collectionFS.chunks.find({files_id: fileRecord._id}, { $sort: {n:1} }).forEach(function(chunk){
				for (var i=0; i < chunk.data.length; i++) {
					blob[(chunk.n * fileRecord.chunkSize) + i] = chunk.data.charCodeAt(i);
					//blob.writeUInt8( ((chunk.n * fileRecord.chunkSize) + i), chunk.data.charCodeAt(i) );
				}
			}); //EO find chunks

			console.log('Handle FileId: ' + fileRecord._id + '    buffer:'+fileSize);
			//do some work, execute user defined functions
			for (var func in fileHandlers) {
				//TODO: check if func in fileRecord.fileURL...if so then skip 
				//if (func in fileRecord.fileURL[].func) next?

				//TODO: try catch running user defined code
				var result = fileHandlers[func]({ fileRecord: fileRecord, blob: blob });

				if (result) { //A result means do something for user defined function...
					//Save on filesystem
					if (result.blob) {
						//save the file and update fileURL
						var extension = (result.extension)?result.extension:result.fileRecord.filename.substr(-3).toLowerCase();
						var myFilename = result.fileRecord._id+'_'+func+'.'+extension;
						var myPathURL = (_fileHandlersSymlinks)?self.pathURL:self.pathURLFallback;
	
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

