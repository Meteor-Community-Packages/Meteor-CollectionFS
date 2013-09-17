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
		//Put file in upload queue
		self.queue.addFile(fileId, file);
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
		//console.log('retrieveBlob');
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
    function dropped(evt, temp) {
        noopHandler(evt);
        // Check if the metadata is a getter / function
        if (typeof metadata === 'function') {
          try {
            var myMetadata = metadata.apply(this, [evt, temp]);
            self.storeFiles(evt.dataTransfer.files, myMetadata, callback);
          } catch(err) {
            throw new Error('acceptDropsOn error in metadata getter, Error: ' + (err.stack || err.message));
          }
        } else {
          // TODO: Should check the metadata
          self.storeFiles(evt.dataTransfer.files, metadata, callback);
        }
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
		return self.queue[fileId];
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
		//console.log('paused:'+self.paused);
		for (var fileId in self.queue) {
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
		var fileItem = self._getItem(fileId);

	    var carry = [];
	    for(var i = 0; i < data.length; i++) {
	        carry.push(data.charCodeAt(i));
	    }

		self.queue[fileId].queueChunks[chunckNumber] = new Uint8Array(carry);//chunkBlob; TODO: use EJSON.binary()
	},

	unionChunkBlobs: function(fileId) {
		var self = this;
		var fileItem = self._getItem(fileId);

		if (fileItem.queueChunks.length == fileItem.countChunks) { //Last worker make chunks into blob
			self.queue[fileId].blob = new Blob(fileItem.queueChunks, { type: fileItem.contentType });
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

		self.connection.apply('loadChunck'+fileItem.collectionName, [
			fileId = fileId, 
			chunkNumber = myChunkNumber, 
			countChunks = fileItem.countChunks
		],[
			wait = true
		], 
			function(error, result) {
				//Callback
				if (result.chunkId) {

					self.queue[fileId].currentChunkServer = result.currentChunk+1;
					self.addDataChunk(fileId, myChunkNumber, result.data);
					var next = self.nextChunk(fileId);
					//console.log('Got: '+myChunkNumber+' next:'+next);
					if (next) {
						self.downloadChunk(fileId, next);
					} else {
						if (self.queue[fileId].queueChunks.length == self.queue[fileId].countChunks) {
							self.unionChunkBlobs(fileId);						
						} else {
							//console.log('Waiting for last arrivals');
						}
						//update and notify listenters

						/*if (self.queue[fileId].currentChunk % 1 == 0) {
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
	
	addFile: function(fileId, file, currentChunk) {
		var self = this;
		var countChunks = Math.ceil(file.size / self.chunkSize);
		self.queue[fileId] = {
			_id: fileId,
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
		};
		//Added upload request to the queue
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
		var f = self.queue[fileId].file;
    if (typeof f === 'undefined') {
      throw new Error('CollectionFS: file pointer from queue is undefined - Error');
    }

		var myreader = new FileReader();
		var start = myChunkNumber * self.chunkSize;
		//make sure not to exeed boundaries
		var stop = Math.min(start + self.chunkSize, f.size);
		var slice = f.slice||f.webkitSlice||f.mozSlice;
    
    if (typeof slice === 'undefined') {
      throw new Error('CollectionFS: file.slice not supported?');
    }
		var blob = slice.call(f, start, stop, f.contentType);

		myreader.onloadend = function(evt) {
			if (evt.target.readyState == FileReader.DONE) {
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

		self.connection.apply('saveChunck'+fileItem.collectionName, [
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

				if (result.chunkId) {
					self.queue[fileId].currentChunkServer = result.currentChunk;

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
			}

		);
	}, //uploadNextChunk
	//nextChunk returns next chunkNumber
	nextChunk: function(fileId) {
		var self = this;
		if (self.isPaused())
			return false;
//self.queue[fileId].countChunks = 1; //Uncomment for debugging
		self.queue[fileId].complete = (self.queue[fileId].currentChunk === self.queue[fileId].countChunks);
		//Que progressed
//			if (self.queue[fileId].currentChunk % 1 == 0 || self.queue[fileId].complete)
			self.fileDeps.changed();
		if (self.queue[fileId].complete) {
			//done
			//XXX: Spawn complete event?
			return false;
		} else {
			if (!self.queue[fileId].complete) { self.queue[fileId].currentChunk++; }
			//XXX: Spawn progress event?
			return self.queue[fileId].currentChunk-1;
		}
	} //EO nextChunk


}); //EO