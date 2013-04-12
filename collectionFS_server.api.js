_.extend(CollectionFS.prototype, {
	storeBuffer: function(filename, buffer, encoding, options) {

		// Default encoding is 'utf8'
		encoding = encoding || 'utf8';

		// Check filename
		if (!filename || filename != ''+filename )
			throw new Error('storeBuffer requires filename string as first parametre');

		// Check buffer
		if (!buffer || buffer.length < 1)
			throw new Error('storeBuffer requires a Buffer as second parametre');

		var self = this;
		var fileId = null;

		// Simulate clienside file keys
		var file = {
			name: filename,
			size: buffer.length,
			type: (options && options.contentType)? options.contentType : '',
			owner: (options && options.owner)? options.owner : ''
		};
		var metadata = (options && options.metadata)?options.metadata : null;

		// Generate new fileRecord
		var fileRecord = self.queue.makeGridFSFileRecord(file, metadata);

		// Insert file record into database
		fileId = self.files.insert(fileRecord);	
		
		// Check that we are ok
		if (!fileId)
			throw new Error('storeBuffer could not create file "' + filename + '" in database');		


		//Put file in upload queue
		for (var n = 0; n < fileRecord.countChunks; n++) {

			// Handle each chunk
			var data = buffer.toString(encoding, (n * fileRecord.chunkSize), 
											   ( (n * fileRecord.chunkSize) + (fileRecord.chunkSize)) );

			// Save data chunk into database		
			var cId = self.chunks.insert({
				"files_id" : fileId,    	// _id of the corresponding files collection entry
				"n" : n,          			// chunks are numbered in order, starting with 0
				"data" : data,          	// the chunk's payload as a BSON binary type
				"encoding" : encoding 		// the encoding for the chunk		
			});

			// Check that we are okay
			if (!cId)
				throw new Error('storeBuffer can not create chunk ' + n + ' in file ' + filename);

			// Update progress or just when completed, use option.noProgress to change
			if (! (options && options.noProgress === true) || n == fileRecord.countChunks - 1)
				self.files.update({ _id: fileId }, { $set: { 
								currentChunk: n, 
								numChunks: n+1, 
								complete: (n == fileRecord.countChunks - 1) } });
		} // EO chunk iteration

		// Return the newly created file id
		return fileId;
	}, // EO storeBuffer

	retrieveBuffer: function(fileId) {
		if (!fileId)
			throw new Error('retrieveBuffer require a file id as parametre');
		// Load file from database
		var self = this;

		// Get file file record
		var fileRecord = self.files.findOne({ _id: fileId });
		if (!fileRecord)
			throw new Error('retrieveBuffer can not find file on id: ' + fileId);

		// Check if file is ready / a uploadDate // TODO: clean up remove complete from fileRecord
		if (!fileRecord.uploadDate || !fileRecord.countChunks || fileRecord.numChunks != fileRecord.countChunks)
			return;

		// Get size of blob
		var fileSize = +fileRecord['length']; //+ Due to Meteor issue

		//Allocate mem
		var blob = new Buffer(fileSize);

		// Try to get all the chunks
		var query = self.chunks.find({ files_id: fileId }, { sort: {n: 1} });

		// 
		if (query.count() == 0) {
			// A completed file with no chunks is corrupted, remove
			if ( fileRecord.complete )
				self.remove({ _id: fileId });
			return;
		} // EO No chunks in file

		query.rewind();

		// Create the file blob for the filehandlers to use
		query.forEach(function(chunk){
			if (! chunk.data ) {
				// Somethings wrong, we'll throw an error
				throw new Error('Filehandlers for file id: ' + fileId + ' got empty data chunk.n:' + chunk.n);
			}

			// Write chunk data to blob using the given encoding
			if(chunk.data.length > 0) {
				blob.write(chunk.data, (chunk.n * fileRecord.chunkSize), chunk.data.length, chunk.encoding);
			}
		}); //EO find chunks

		return blob;
	} // EO retrieveBuffer
});

_.extend(_queueCollectionFS.prototype, {
	addFile: function(fileId, buffer) {
		// Load buffer chunks into chunks for fileId
	},
	getFile: function(fileId) {
		// Load chunks into 
		
	}
});