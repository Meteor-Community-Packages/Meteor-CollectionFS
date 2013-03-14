(function () {

	_.extend(CollectionFS.prototype, {
		storeFile: function(file, options) {
			var self = this;
			var fileId = null;
			if (Meteor.isClient) {
				var record = self.que.makeGridFSFileRecord(file, options);
				fileId = self.files.insert(record);	
				if (!fileId)
					return null;		
				//Put file in upload que
				self.que.addFile(fileId, file);
			}
			if (Meteor.isServer) {
				throw new Error("collectionFS server storeFile not implemented");
				//TODO: guess gridFS would work?
				//Java ex.
				//GridFS myFS = new GridFS(myDatabase);            // returns a default GridFS (e.g. "fs" bucket collection)
				//myFS.storeFile(new File("/tmp/largething.mpg")); // saves the file into the "fs" GridFS store
			}
			return fileId;
		}, //EO storeFile
		//callback(fileItem)
		retrieveBlob: function(fileId, callback) {
			//console.log('retrieveBlob');
			var self = this;
			if (Meteor.isClient) {
				var fileItem = self.que._getItem(fileId);
				//if file blob in que, then use the file instead of downloading...
				if (fileItem &&(fileItem.file||fileItem.blob)) {
					//if file if blob
					callback(fileItem);		
				} else {	
					var fileRecord = self.files.findOne({ _id: fileId});
					//download into que file blob
					self.que.getFile(fileRecord, callback);
				}
				//return blob
			} //EO isClient	
		}, //EO retrieveBlob
		//getBlobAsUrl - seems to be the only way getting images into html via db - and files via <a download>
		getBlobAsUrl: function(fileId, callback) {}, //EO getBlobAsUrl
		retrieveImage: function(fileId, callback) {}, //EO retrieveImage
		retrieveText: function(fileId, callback) {}, //EO retrieveText
		retrieveFile: function(fileId, callback) {
			//check if found locally - then use directly
			//fetch from server, via methods call - dont want the chunks collection
		} //EO retriveFile

	}); //EO extend collection


	_.extend(_queCollectionFS.prototype, {
		//To deprecate all timer functions
		getTimer: function(prefix, name) {
			var self = this;
			var myName = prefix+self._name+name;
			return Session.get(myName);
		},

		setTimer: function(prefix, name, time) {
			var self = this;
			var myName = prefix+self._name+name;
			Session.set(myName, time);
		},

		startTimer: function() {
			var self = this;
			var myIndex = self.queLastTimeNr++;
			self.queLastTime[myIndex] = Date.now();
			return myIndex;
		},

		getTimeQueLength: function() {
			var self = this;
			return Session.get(self._name+'queLastTimeLength');
		},

		stopTimer: function(prefix, name, index) {
			var self = this;
			var myName = prefix+self._name+name;
			var lastAvgTime = Session.get(myName);
			var avgTime = (lastAvgTime)?( Math.round( ((Date.now()-self.queLastTime[index]) + (lastAvgTime*9)) / 10 ) ):(Date.now()-self.queLastTime[index]);
			delete self.queLastTime[index]; //clean up
			var timeQueLength = 0;
			for (var a in self.queLastTime)
				timeQueLength++;
			Session.set(self._name+'queLastTimeLength', timeQueLength);
			Session.set(myName, avgTime);
		},
		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// Getters //////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////

		getItem: function(fileId) {
			var self = this;
			Deps.depend(self.fileDeps);
			return self._getItem(fileId);
		}, //EO getItem	

		//_getItem is privat function, not reactive
		_getItem: function(fileId) {
			var self = this;
			return self.que[fileId];
		}, //EO _getItem

		progress: function(fileId, onlyBuffer) {
			var self = this;
			var fileItem = self._getItem(fileId);
			if (!fileItem)
				return false;
			var pointerChunk = (onlyBuffer)?fileItem.currentChunk:fileItem.currentChunkServer; //TODO:
			Deps.depend(self.fileDeps);
			if (fileItem)
				return Math.round(pointerChunk / (fileItem.countChunks) * 100)
			else
				return 0;
		},

		isComplete: function(fileId) {
			var self = this;
			Deps.depend(self.fileDeps);
			return self._getItem(fileId).complete;
		}, //EO isComplete

		isDownloading: function(fileId) {
			var self = this;
			var fileItem = self._getItem(fileId);
			if (!fileItem)
				return false;
	    	var myProgress1 = Filesystem.que.progress(fileId);
	    	var myProgress2 = Math.round(fileItem.currentChunk / (fileItem.countChunks - 1) * 100);
		    return (Math.max(myProgress1, myProgress2) > 0 && Math.min(myProgress1, myProgress2) < 100 && !fileItem.file);
		},

		isDownloaded: function(fileId) {
			var self = this;
			Deps.depend(self.fileDeps);
			var fileItem = self._getItem(fileId);
			if (fileItem.file)
				return true;
			if (fileItem.download) {
				return (fileItem.currentChunk == fileItem.countChunks-1);
			}
			return false;
		},

		isPaused: function() {
			var self = this;
			Deps.depend(self.fileDeps);
			return self.paused;
		},


		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// Que //////////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////
		//Bind to hot push code to resume after server reboot
		resume: function() {
			var self = this;
			self.paused = false;
			self.fileDeps.changed();
			//console.log('paused:'+self.paused);
			for (var fileId in self.que) {
				var fileItem = self._getItem(fileId);
				if (fileItem.download) {
					//Spawn loaders
					if (!self.spawns)
						self.downloadChunk(fileId)
					else
						for (var i = 0; i < self.spawns; i++)
							setTimeout(function() { self.downloadChunk(fileId); });
				} else {
					//Spawn loaders
					if (!self.spawns)
						self.getDataChunk(fileId)
					else
						for (var i = 0; i < self.spawns; i++)
							setTimeout(function() { self.getDataChunk(fileId); });
				}
			}
		}, //EO resume

		pause: function() {
			var self = this;
			this.paused = true;
			this.fileDeps.changed();
		},

		resumeFile: function(fileRecord, file) {
			var self = this;
			var testFileRecord = self.makeGridFSFileRecord(file);
			if (self.compareFile(fileRecord, testFileRecord)) {
				self.addFile(fileRecord._id, file, fileRecord.currentChunk);
				return true;
			}
			//console.log('resumeFile - files dont match');
			return false; //Didnt compare - cant resumeFile
		}, //EO function
		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// DOWNLOAD  ////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////
		addDataChunk: function(fileId, chunckNumber, data) {
			var self = this;
			var filereaderTimer = self.startTimer();
			var fileItem = self._getItem(fileId);

		    var carry = [];
		    for(var i = 0; i < data.length; i++) {
		        carry.push(data.charCodeAt(i));
		    }

			self.que[fileId].queChunks[chunckNumber] = new Uint8Array(carry);//chunkBlob;
			self.stopTimer('download', 'filereader', filereaderTimer);
		},

		unionChunkBlobs: function(fileId) {
			var self = this;
			var fileItem = self._getItem(fileId);

			if (fileItem.queChunks.length == fileItem.countChunks) { //Last worker make chunks into blob
				self.que[fileId].blob = new Blob(fileItem.queChunks, { type: fileItem.contentType });
				var myCallback = fileItem.callback;
				if (fileItem.callback) {
					fileItem.callback = null; //Only do this once
					myCallback(self._getItem(fileId));
				}
				//Now completed, trigger update
				self.fileDeps.changed();
			}	
		},

		downloadChunk: function(fileId, optChunkNumber) {
			var self = this;
			var fileItem = self._getItem(fileId);
			var myChunkNumber = optChunkNumber || self.nextChunk(fileId);
			if (myChunkNumber === false)
				return false;

			self.lastCountDownload++;
			if (self.lastTimeDownload) {
				if (self.lastCountDownload == 10) {
					self.lastCountDownload = 0;
					var bitPrSecDownload = (8 * self.chunkSize * 10) / ((Date.now()-self.lastTimeDownload ) / 100);
					var oldBitPrSecDownload = (Session.get('bitPrSecDownload'))?Session.get('bitPrSecDownload'):bitPrSecDownload;
					Session.set('bitPrSecDownload', Math.round( (oldBitPrSecDownload*9 + bitPrSecDownload)/10) );
					self.lastTimeDownload = Date.now();
				}
			} else {
				self.lastTimeDownload = Date.now();
			}

			var timerTotal = self.startTimer();
			var timerMeteorCall = self.startTimer();

			Meteor.apply('loadChunck'+fileItem.collectionName, [
				fileId = fileId, 
				chunkNumber = myChunkNumber, 
				countChunks = fileItem.countChunks
			],[
				wait = true
			], 
				function(error, result) {
					//Callback
					self.stopTimer('download', 'meteorcall', timerMeteorCall);
					if (result.chunkId) {

						self.que[fileId].currentChunkServer = result.currentChunk+1;
						self.addDataChunk(fileId, myChunkNumber, result.data);
						var next = self.nextChunk(fileId);
						//console.log('Got: '+myChunkNumber+' next:'+next);
						self.setTimer('download', 'meteorcallserver', result.time);
						self.stopTimer('download', 'total', timerTotal);
						if (next) {
							self.downloadChunk(fileId, next);
						} else {
							if (self.que[fileId].queChunks.length == self.que[fileId].countChunks) {
								self.unionChunkBlobs(fileId);						
							} else {
								//console.log('Waiting for last arrivals');
							}
							//update and notify listenters

							/*if (self.que[fileId].currentChunk % 1 == 0) {
								self.fileDeps.changed();
							}*/
						}
					} 
				}//EO func
			);//EO Meteor.apply			
		}, //EO 

		// getFile callback(fileItem)
		getFile: function(fileRecord, callback, currentChunk) {
			var self = this;
			self.que[fileRecord._id] = {
				_id: fileRecord._id,
				download: true,
				complete: false,
				file: null,
				blob: null,
				queChunks: [],
				collectionName:self._name,
				contentType: fileRecord.contentType,
				currentChunkServer: (currentChunk)?currentChunk:0,
				currentChunk: (currentChunk)?currentChunk:0, //current loaded chunk of countChunks-1  
				countChunks: fileRecord.countChunks,
				callback: callback,
//				len: fileRecord['len']
				length: ''+fileRecord['length']  //When fix in meteor dont add ''+

			};

			//Added download request to the que
			self.fileDeps.changed();

			//Spawn loaders
			if (!self.spawns)
				self.downloadChunk(fileRecord._id)
			else
				for (var i = 0; i < self.spawns; i++)
					setTimeout(function() { self.downloadChunk(fileRecord._id); });
		}, //EO 
		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// UPLOAD ///////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////
		
		addFile: function(fileId, file, currentChunk) {
			var self = this;
			var countChunks = Math.ceil(file.size / self.chunkSize);
			self.que[fileId] = {
				_id: fileId,
				download: false,
				complete: false,
				file: file,
				collectionName:self._name,
				currentChunkServer: (currentChunk)?currentChunk:0,
				currentChunk: (currentChunk)?currentChunk:0, //current loaded chunk of countChunks-1  
				countChunks: countChunks,
				//filereader: new FileReader(),	
			};
			//Added upload request to the que
			self.fileDeps.changed();
			
			//Spawn loaders
			if (!self.spawns)
				self.getDataChunk(fileId, 0)
			else
				for (var i = 0; i < self.spawns; i++)
					setTimeout(function() { self.getDataChunk(fileId); });
		}, //EO addFile

		getDataChunk: function(fileId, optChunkNumber) {
			var self = this;
			var myChunkNumber = optChunkNumber || self.nextChunk(fileId);
			if (myChunkNumber === false)
				return false;
			var f = self.que[fileId].file;
			var myreader = new FileReader();
			var start = myChunkNumber * self.chunkSize;
			//make sure not to exeed boundaries
			var stop = Math.min(start + self.chunkSize, f.size);
			var timerReader = self.startTimer();
			var slice = f.slice||f.webkitSlice||f.mozSlice;
			var blob = slice.call(f, start, stop, f.contentType);

			myreader.onloadend = function(evt) {
				if (evt.target.readyState == FileReader.DONE) {
					self.stopTimer('upload', 'filereader', timerReader);
					self.uploadChunk(fileId, myChunkNumber, evt.target.result);
				}
			};

			if (blob) {
				myreader.readAsBinaryString(blob);
			} else {
				throw new Error('Slice function not supported, fileId:'+fileId);
			}
		}, //EO get data chunk

		uploadChunk: function(fileId, chunkNumber, data) {
			var self = this;
			var fileItem = self._getItem(fileId);

			self.lastCountUpload++;
			if (self.lastTimeUpload) {
				if (self.lastCountUpload == 10) {
					self.lastCountUpload = 0;
					var bitPrSecUpload = (8 * self.chunkSize * 10) / ((Date.now()-self.lastTimeUpload ) / 100);
					var oldBitPrSecUpload = (Session.get('bitPrSecUpload'))?Session.get('bitPrSecUpload'):bitPrSecUpload;
					Session.set('bitPrSecUpload', Math.round( (oldBitPrSecUpload*9 + bitPrSecUpload)/10) );
					self.lastTimeUpload = Date.now();
				}
			} else {
				self.lastTimeUpload = Date.now();
			}

			var timerTotal = self.startTimer();
			var timerMeteorCall = self.startTimer();

			Meteor.apply('saveChunck'+fileItem.collectionName, [
				fileId = fileId, 
				currentChunk = chunkNumber, 
				countChunks = fileItem.countChunks, 
				data = data
			],[
				wait = true
			], function(error, result) {
					//Callback
					if (error)
						console.log(error);
					self.setTimer('upload', 'meteorcallserver', result.time);
					self.stopTimer('upload', 'meteorcall', timerMeteorCall);
					if (result.chunkId) {
						self.que[fileId].currentChunkServer = result.currentChunk;

						//TODO: Really, should the next function rule? or the result.currentChunk?
						//The result could be async? multiple users
						//Use in >saveChunk< function: 
						//	updating files $inc: { currentChunk: 0 } until == countChunks
						//	if not missing any chunks then complete else request client to upload by returning missing chunk number?
						//
						// var next = result.currentChunck;  //Chunck to download.. if not the save func gotta test fs.chunks index

						var next = self.nextChunk(result.fileId); //or let server decide
						//!result.complete && 
						if (!result.complete) {
							self.getDataChunk(result.fileId, next);
						} else {
							//Client or server check chunks..

						}									
					} 
					self.stopTimer('upload', 'total', timerTotal);
				}

			);
		}, //uploadNextChunk
		//nextChunk returns next chunkNumber
		nextChunk: function(fileId) {
			var self = this;
			if (self.isPaused())
				return false;
	//self.que[fileId].countChunks = 1; //Uncomment for debugging
			self.que[fileId].complete = (self.que[fileId].currentChunk == self.que[fileId].countChunks);
			//Que progressed
			if (self.que[fileId].currentChunk % 1 == 0 || self.que[fileId].complete)
				self.fileDeps.changed();
			if (self.que[fileId].complete) {
				//done
				//XXX: Spawn complete event?
				return false;
			} else {
				if (!self.que[fileId].complete) { self.que[fileId].currentChunk++; }
				//XXX: Spawn progress event?
				return self.que[fileId].currentChunk-1;
			}
		} //EO nextChunk


	}); //EO

}) (); //EO file
