/*
 * Temporary Storage
 *
 * Temporary storage is used for chunked uploads until all chunks are received
 * and all copies have been made or given up. In some cases, the original file
 * is stored only in temporary storage (for example, if all copies do some
 * manipulation in beforeSave). This is why we use the temporary file as the
 * basis for each saved copy, and then remove it after all copies are saved.
 *
 * Every chunk is saved as an individual temporary file. This is safer than
 * attempting to write multiple incoming chunks to different positions in a
 * single temporary file, which can lead to write conflicts.
 *
 * Using temp files also allows us to easily resume uploads, even if the server
 * restarts, and to keep the working memory clear.
 */

// The FS.TempStore emits events that others are able to listen to
var EventEmitter = Npm.require('events').EventEmitter;

// We have a special stream concating all chunk files into one readable stream
var Readable = Npm.require('stream').Readable;
var util = Npm.require('util');


/** @namespace FS.TempStore
 * @property FS.TempStore
 * @type {object}
 */

// Make it an event emitter
FS.TempStore = new EventEmitter();

FS.TempStore.Storage = null;

// Select a storage adapter for temp storage

// If the file worker is installed we would prefer to use the gridfs sa
// for scalability. We also default to gridfs if filesystem is not found
if (FS.Store.GridFS && (FS.FileWorker || !FS.Store.FileSystem)) {

  // Use the gridfs
  FS.TempStore.Storage = new FS.Store.GridFS('_tempstore', { internal: true });

} else if (FS.Store.FileSystem) {

  // use the Filesystem
  FS.TempStore.Storage = new FS.Store.FileSystem('_tempstore', { internal: true });

} else {
  console.warn('FS.TempStore.Storage is not set, install cfs-filesystem, cfs-gridfs or set it manually');
}


if (FS.TempStore.Storage !== null) {
  console.log('TempStore is mounted on', FS.TempStore.Storage.typeName);
}


// We update the fileObj on progress
FS.TempStore.on('progress', function(fileObj, chunk, count) {
  // Update the chunk counter
  var modifyer = { chunkCount: count };

  // Check if all chunks are uploaded
  if (count === fileObj.chunkSum) {
    // Check if the file has been uploaded before
    if (typeof fileObj.uploadedAt === 'undefined') {
      // We set the uploadedAt date
      modifyer.uploadedAt = new Date();
    } else {
      // We have been uploaded so an event were file data is updated is
      // called synchronizing - so this must be a synchronizedAt?
      modifyer.synchronizedAt = new Date();
    }
  }
  // Update the chunkCount on the fileObject
  fileObj.update({ $set: modifyer });
});

// FS.TempStore.on('uploaded', function(fileObj, inOneStream) {
//   console.log(fileObj.name + ' is uploaded!!');
// });

// Stream implementation

// Naming convention for chunk files
_chunkPath = function(n) {
  return (n || 0) + '.chunk';
};


_fileReference = function(fileObj, chunk) {
  if (FS.TempStore.Storage) {

    // Return a fitting fileKey SA specific
    return FS.TempStore.Storage.adapter.fileKey({
      collectionName: fileObj.collectionName,
      _id: fileObj._id,
      name: _chunkPath(chunk)
    });

  }
};

/**
 * @method FS.TempStore.exists
 * @param {FS.File} File object
 */
FS.TempStore.exists = function(fileObj) {
  console.warn('This function is not correctly implemented using SA in TempStore');
  // if (fileObj.isMounted()) {
  //   return fs.existsSync(_filePath(fileObj));
  // } else {
  //   // It cant be
  //   return false;
  // }
};

FS.TempStore.listParts = function(fileObj) {
  var self = this;
  console.warn('This function is not correctly implemented using SA in TempStore');
  // // List of missing chunks
  // var partList = {};
  // // File path
  // var filePath = _filePath(fileObj);
  // // We only start work if its found
  // if (fs.existsSync( filePath )) {
  //   // Read all the chunks in folder
  //   chunkPaths = fs.readdirSync(filePath);
  //   // Unlink each file
  //   for (var i = 0; i < chunkPaths; i++) {
  //     // add part number to list
  //     partList[i] = i;
  //   }
  // }
  // // return the part list
  // return partList;
};

FS.TempStore.removeFile = function(fileObj) {
  var self = this;
  if (FS.TempStore.Storage) {

    // Emit event
    self.emit('remove', fileObj);

    // Unlink each file
    for (var i = 0; i < fileObj.chunkSum; i++) {
      // Get the chunk path
      FS.TempStore.Storage.adapter.remove( _fileReference(fileObj, i) );
    }

  } else {
    throw new Error('FS.TempStore.removeFile cannot remove file, we dont ' +
            'have a storage adapter yet');
  }
};


// WRITE STREAM
FS.TempStore.createWriteStream = function(fileObj, options) {
  var self = this;

  if (!FS.TempStore.Storage)
    throw new Error('FS.TempStore.createWriteStream cannot remove file, we ' +
            'dont have a storage adapter yet');

  // XXX: it should be possible for a store to sync by storing data into the
  // tempstore - this could be done nicely by setting the store name as string
  // in the chunk variable?
  // This store name could be passed on the the fileworker via the uploaded
  // event
  // So the uploaded event can return:
  // undefined - if data is stored into and should sync out to all storage adapters
  // number - if a chunk has been uploaded
  // string - if a storage adapter wants to sync its data to the other SA's




  // If chunk is a number we use that otherwise we set it to 0
  var chunk = (options === +options)?options: 0;

  if (fileObj.isMounted()) {

    // Find a nice location for the chunk data
    var chunkReference = _fileReference(fileObj, chunk);

    // Create the stream as Meteor safe stream
    var writeStream = FS.TempStore.Storage.adapter.createWriteStream( chunkReference );

    // When the stream closes we update the chunkCount
    writeStream.safeOn('end', function(fileKey) {
      // var chunkCount = fs.readdirSync(filePath).length;
      // XXX: We should track this in a collection to keep track of chunks
      // This could fail if a chunk is uploaded twice...
      var chunkCount = fileObj.chunkCount + 1;

      // Progress
      self.emit('progress', fileObj, chunk, chunkCount);

      if (options === +options) {
        // options is number - this is a chunked upload


        // Check if upload is completed
        if (chunkCount === fileObj.chunkSum) {
          self.emit('stored', fileObj);
          self.emit('ready', fileObj, chunkCount);
        }

      } else if (options === ''+options) {
        // options is a string - so we are passed the name of syncronizing SA
        self.emit('synchronized', fileObj, options);
        self.emit('ready', fileObj, options);

      } else if (typeof options === 'undefined') {
        // options is not defined - this is direct use of server api

        // We created a writestream without chunk defined meaning this was used
        // as a regular createWriteStream method so we only stream to one chunk
        // file - 0.chunk - therefor setting the chunkCount and chunkSum to 1


        // We know this upload is complete - this could be a server transport
        // set true marking "one stream" since chunk number is not defined
        // we assume that we are accessed by others than the Access Point /
        // file upload - This could be server streaming or client direct uploads
        self.emit('uploaded', fileObj);
        self.emit('ready', fileObj);

      } else {
        throw new Error('FS.TempStore.createWriteStream got unexpected type in options');
      }
    });

    return writeStream;

  } else {
    throw new Error('FS.TempStore.createWriteStream cannot work with unmounted file');
  }
};

// READSTREAM
_TempstoreReadStream = function(fileObj, options) {
  var self = this;
  Readable.call(this, options);

  self.fileObj = fileObj;

  // Init current chunk pointer
  self.currentChunk = 0;

  // Init the sum of chunk
  self.chunkSum = fileObj.chunkSum;

  // Fire up the chunk read stream
  self.nextChunkStream();

};

// Add readable stream methods
util.inherits(_TempstoreReadStream, Readable);

// This is the core funciton of this read stream - we read chunk data from all
// chunks
_TempstoreReadStream.prototype.nextChunkStream = function() {
  var self = this;

  if (self.currentChunk < self.chunkSum) {
    var chunkReference = _fileReference(self.fileObj, self.currentChunk++);

    console.log('READ CHUNK: ' + self.currentChunk);
    // create the chunk stream
    self.chunkReadStream = FS.TempStore.Storage.adapter.createReadStream(chunkReference);

    self.chunkReadStream.on('end', function() {
      // This chunk has ended so we get the next chunk stream
      self.nextChunkStream();
    });

    self.chunkReadStream.on('error', function() {
      // XXX: we could emit the org error too
      self.emit('error', 'FS.TempStore could not read chunk ' + self.currentChunk);
    });

    self.chunkReadStream.on('data', function(chunkData) {
      if (!self.push(chunkData)) {
        // We should pause the stream the chunk stream...
        self.chunkReadStream.pause();
      }
    });

  } else {
    // We end this stream we have completed reading the chunks
    self.push(null);
  };
};

_TempstoreReadStream.prototype._read = function() {
  var self = this;

  // I guess we will just make sure the readstream is not paused
  self.chunkReadStream.resume();
};

// Create a nice api handle
FS.TempStore.createReadStream = function(fileObj) {

  if (!FS.TempStore.Storage)
    throw new Error('FS.TempStore.createReadStream cannot remove file, we ' +
            'dont have a storage adapter yet');

  if (fileObj.isMounted()) {
    return new _TempstoreReadStream(fileObj);
  } else {
    throw new Error('FS.TempStore.createReadStream cannot work with unmounted file');
  }
};
