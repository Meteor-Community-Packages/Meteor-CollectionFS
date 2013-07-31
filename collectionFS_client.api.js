(function () {

    _.extend(CollectionFS.prototype, {
		storeFile: function(file, options) {
			var self = this;
			var fileId = null;
			var record = self.queue.makeGridFSFileRecord(file, options);
                        if (!self.fileIsAllowed(record)) {
                            return null;
                        }
			fileId = self.files.insert(record);	
			if (!fileId) {
                            return null;
                        }
            file._id = fileId;
			//Put file in upload queue
			self.queue.addFile(file);
			return fileId;
		}, //EO storeFile
                storeFiles: function(files, metadata, callback) {
                        var self = this, fileId, fileIds = [], file, temp_md;
                        if (files && files.length) {
                            for (var i = 0, ln = files.length; i < ln; i++) {
                                file = files[i];
                                if (metadata !== undefined && typeof metadata === 'function') {
                                    temp_md = metadata(file);
                                } else {
                                    temp_md = metadata;
                                }
                                fileId = self.storeFile(file, temp_md);
                                if (fileId) {
                                    fileIds.push(fileId);
                                }
                                if (callback !== undefined && typeof callback === 'function') {
                                    callback(file, fileId);
                                }
                            }
                        }
                        return fileIds;
                }, //EO storeFiles
		//callback(fileItem)
		retrieveBlob: function(fileId, callback) {
			var self = this;
			var fileItem = self.queue._getItem(fileId);
			//if file blob in queue, then use the file instead of downloading...
			if (fileItem &&(fileItem.file||fileItem.blob)) {
				//if file if blob
				callback(fileItem);		
			} else {	
				var fileRecord = self.files.findOne({ _id: fileId});
				//download into queue file blob
				self.queue.getFile(fileRecord, callback);
			}
			//return blob
		}, //EO retrieveBlob
		retrieveFile: function(fileId, callback) {
			//check if found locally - then use directly
			//fetch from server, via methods call - dont want the chunks collection
		}, //EO retriveFile
                acceptDropsOn: function(templateName, selector, metadata, callback) {
                        var self = this, events = {};
                        // Prevent default drag and drop
                        function noopHandler(evt) {
                            evt.stopPropagation();
                            evt.preventDefault();
                        }

                        // Handle file dropped
                        function dropped(evt) {
                            noopHandler(evt);
                            self.storeFiles(evt.dataTransfer.files, metadata, callback);
                        }
                        
                        events['dragenter ' + selector] = noopHandler;
                        events['dragexit ' + selector] = noopHandler;
                        events['dragover ' + selector] = noopHandler;
                        events['dragend ' + selector] = noopHandler;
                        events['drop ' + selector] = dropped;
                        
                        Template[templateName].events(events);
                }
	}); //EO extend collection


	_.extend(_queueCollectionFS.prototype, {

		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// Getters //////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////

		getItem: function(fileId) {
			var self = this;
			self.fileDeps.depend();
			return self._getItem(fileId);
		}, //EO getItem	

		//_getItem is private function, not reactive
		_getItem: function(fileId) {
			var self = this;
            var file;
			for(var i in self.queue){
                file = self.queue[i];
				if(file._id === fileId){
					return file;
				}
			}
			for(var i in self.running){
                file = self.running[i];
				if(file._id === fileId){
					return file;
				}
			}
			return null;
		}, //EO _getItem
                
                //_getProgress is private function, not reactive
                _getProgress: function(fileId, onlyBuffer) {
                        var self = this;
                        var fileItem = self._getItem(fileId);
                        if (!fileItem) {
                            return false;
                        }

                        if (fileItem.complete) {
                            return 100;
                        }

                        var pointerChunk = (onlyBuffer) ? fileItem.currentChunk : fileItem.currentChunkServer; //TODO:

                        if (fileItem) {
                            return Math.round(pointerChunk / fileItem.countChunks * 100);
                        } else {
                            return 0;
                        }
                }, //EO _getProgress

		progress: function(fileId, onlyBuffer) {
			var self = this;
                        self.fileDeps.depend();
                        return self._getProgress(fileId, onlyBuffer);
		}, //EO progress

		isComplete: function(fileId) {
                        var self = this;
                        self.fileDeps.depend();
                        var fileItem = self._getItem(fileId);
                        if (!fileItem) {
                            return true;
                        }
                        return fileItem.complete;
		}, //EO isComplete
                
                isUploading: function(fileId) {
                        var self = this;
                        self.fileDeps.depend();
                        var fileItem = self._getItem(fileId);
                        if (!fileItem || fileItem.download) {
                            return false;
                        }
                        var progress = self._getProgress(fileId);
                        return (progress && progress > 0 && progress < 100);
                }, //EO isUploading

		isDownloading: function(fileId) {
			var self = this;
                        self.fileDeps.depend();
			var fileItem = self._getItem(fileId);
			if (!fileItem || !fileItem.download) {
                            return false;
                        }
                        var progress = self._getProgress(fileId);
                        return (progress && progress > 0 && progress < 100);
		}, //EO isDownloading

		isDownloaded: function(fileId) {
			var self = this;
			self.fileDeps.depend();
			var fileItem = self._getItem(fileId);
			if (fileItem.file)
				return true;
			if (fileItem.download) {
				return (fileItem.currentChunk === fileItem.countChunks-1);
			}
			return false;
		}, //EO isDownloaded

		isPaused: function() {
			var self = this;
			self.fileDeps.depend();
			return self.paused;
		}, //EO isPaused


		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// Que //////////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////
		//Bind to hot push code to resume after server reboot
		resume: function() {
			var self = this;
			self.paused = false;
			self.fileDeps.changed();
			for (var file in self.queue) {
				var fileItem = file;
				if (fileItem.download) {
					//Spawn loaders
					if (!self.spawns)
						self.downloadChunk(file)
					else
						for (var i = 0; i < self.spawns; i++)
							setTimeout(function() { self.downloadChunk(file); });
				} else {
					//Spawn loaders
					if (!self.spawns)
						self.getDataChunk(file)
					else
						for (var i = 0; i < self.spawns; i++)
							setTimeout(function() { self.getDataChunk(file); });
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
			return false; //Didnt compare - cant resumeFile
		}, //EO function
		//////////////////////////////////////////////////////////////////////////////////////////////////
		/////////////////////////////////////////// DOWNLOAD  ////////////////////////////////////////////
		//////////////////////////////////////////////////////////////////////////////////////////////////
		addDataChunk: function(file, chunckNumber, data) {
			var self = this;
			var fileItem = file;

		    var carry = [];
		    for(var i = 0; i < data.length; i++) {
		        carry.push(data.charCodeAt(i));
		    }

			file.queueChunks[chunckNumber] = new Uint8Array(carry);//chunkBlob; TODO: use EJSON.binary()
		},

		unionChunkBlobs: function(file) {
			var self = this;
			var fileItem = file;

			if (fileItem.queueChunks.length == fileItem.countChunks) { //Last worker make chunks into blob
				file.blob = new Blob(fileItem.queueChunks, { type: fileItem.contentType });
				var myCallback = fileItem.callback;
				if (fileItem.callback) {
					fileItem.callback = null; //Only do this once
					myCallback(file);
				}
				//Now completed, trigger update
				self.fileDeps.changed();
			}	
		},

		downloadChunk: function(file, optChunkNumber) {
			var self = this;
			var fileItem = file;
			var myChunkNumber = optChunkNumber || self.nextChunk(file);
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

			self.connection.apply('loadChunck'+fileItem.collectionName, [
				fileId = file._id, 
				chunkNumber = myChunkNumber, 
				countChunks = fileItem.countChunks
			],[
				wait = true
			], 
				function(error, result) {
					//Callback
					if (result.chunkId) {

						file.currentChunkServer = result.currentChunk+1;
						self.addDataChunk(file, myChunkNumber, result.data);
						var next = self.nextChunk(file);
						if (next) {
							self.downloadChunk(file, next);
						} else {
							if (file.queueChunks.length == file.countChunks) {
								self.unionChunkBlobs(file);						
							}
						}
					} 
				}//EO func
			);//EO Meteor.apply			
		}, //EO 

		// getFile callback(fileItem)
		getFile: function(fileRecord, callback, currentChunk) {
			var self = this;
			self.queue[fileRecord._id] = {
				_id: fileRecord._id,
				download: true,
				complete: false,
				file: null,
				blob: null,
				queueChunks: [],
				collectionName:self._name,
                                filename: fileRecord.filename,
				connection:self.connection,
				contentType: fileRecord.contentType,
				currentChunkServer: (currentChunk)?currentChunk:0,
				currentChunk: (currentChunk)?currentChunk:0, //current loaded chunk of countChunks-1  
				countChunks: fileRecord.countChunks,
				callback: callback,
//				len: fileRecord['len']
				length: ''+fileRecord['length']  //When fix in meteor dont add ''+

			};

			//Added download request to the queue
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

		addFile: function(file, currentChunk) {
			var self = this;
			var countChunks = Math.ceil(file.size / self.chunkSize);
			self.queue.push({
				_id: file._id,
				download: false,
				complete: false,
				file: file,
                                filename: file.name,
				collectionName:self._name,
				connection:self.connection,
				currentChunkServer: (currentChunk)?currentChunk:0,
				currentChunk: (currentChunk)?currentChunk:0, //current loaded chunk of countChunks-1  
				countChunks: countChunks
				//filereader: new FileReader(),	
			});
			//Added upload request to the queue
			self.fileDeps.changed();

			//Spawn loaders
			setTimeout(function(){self.start();});
			/* if (!self.spawns)
				self.getDataChunk(fileId, 0)
			else
				for (var i = 0; i < self.spawns; i++)
					setTimeout(function() { self.getDataChunk(fileId); }); */
		}, //EO addFile
		start: function(){
			var self = this;
			if(self.running.length >= self.maxTransfers){
				setTimeout(function(){self.start();},1000);
				return;
			}
			var file = self.queue.shift();
			self.running.push(file);
			if (!self.spawns)
				self.getDataChunk(file, 0)
			else
				for (var i = 0; i < self.spawns; i++)
					setTimeout(function() { self.getDataChunk(file); });
		},

		getDataChunk: function(file, optChunkNumber) {
			var self = this;
			var myChunkNumber = optChunkNumber || self.nextChunk(file);
			if (myChunkNumber === false)
				return false;
			var f = file.file;
			var myreader = new FileReader();
			var start = myChunkNumber * self.chunkSize;
			//make sure not to exeed boundaries
			var stop = Math.min(start + self.chunkSize, f.size);
			var slice = f.slice||f.webkitSlice||f.mozSlice;
			var blob = slice.call(f, start, stop, f.contentType);

			myreader.onloadend = function(evt) {
				if (evt.target.readyState == FileReader.DONE) {
					self.uploadChunk(file, myChunkNumber, evt.target.result);
				}
			};

			if (blob) {
				myreader.readAsBinaryString(blob);
			} else {
				throw new Error('Slice function not supported, fileId:'+file._id);
			}
		}, //EO get data chunk

		uploadChunk: function(file, chunkNumber, data) {
			var self = this;
			var fileItem = file;

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

			self.connection.apply('saveChunck'+fileItem.collectionName, [
				fileId = file._id, 
				currentChunk = chunkNumber, 
				countChunks = fileItem.countChunks, 
				data = data
			],[
				wait = true
			], function(error, result) {
					//Callback
					if (error)
						console.log(error);

					if (result.chunkId) {
						file.currentChunkServer = result.currentChunk;

						//TODO: Really, should the next function rule? or the result.currentChunk?
						//The result could be async? multiple users
						//Use in >saveChunk< function: 
						//	updating files $inc: { currentChunk: 0 } until == countChunks
						//	if not missing any chunks then complete else request client to upload by returning missing chunk number?
						//
						// var next = result.currentChunck;  //Chunck to download.. if not the save func gotta test fs.chunks index

						var next = self.nextChunk(file); //or let server decide
						//!result.complete && 
						if (!result.complete) {
							self.getDataChunk(file, next);
						} else {
							//Client or server check chunks..
							var idx = self.running.indexOf(file);
							self.running.splice(idx,1);
						}									
					} 
				}

			);
		}, //uploadNextChunk
		//nextChunk returns next chunkNumber
		nextChunk: function(file) {
			var self = this;
			if (self.isPaused())
				return false;
	//self.queue[fileId].countChunks = 1; //Uncomment for debugging
			file.complete = (file.currentChunk === file.countChunks);
			//self.queue[fileId].complete = (self.queue[fileId].currentChunk === self.queue[fileId].countChunks);
			//Que progressed
//			if (self.queue[fileId].currentChunk % 1 == 0 || self.queue[fileId].complete)
				self.fileDeps.changed();
			if (file.complete) {
				//done
				//XXX: Spawn complete event?
				return false;
			} else {
				if (!file.complete) { file.currentChunk++; }
				//XXX: Spawn progress event?
				return file.currentChunk-1;
			}
		} //EO nextChunk


	}); //EO

}) (); //EO file