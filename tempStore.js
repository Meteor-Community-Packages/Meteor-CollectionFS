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

fs = Npm.require('fs');
path = Npm.require('path');
os = Npm.require('os');

// The FS.TempStore emits events that others are able to listen to
var EventEmitter = Npm.require('events').EventEmitter;

// We have a special stream concating all chunk files into one readable stream
var Readable = Npm.require('stream').Readable;
var util = Npm.require('util');

// We get the os default temp folder and create a folder "cfs" in there
var tempFolder = path.resolve(os.tmpDir(), 'cfs');

// Create the temp folder
if (!fs.existsSync(tempFolder)) {
  try {
    fs.mkdirSync(tempFolder);
  } catch(err) {
    throw new Error('Could not create temporary storage');
  }
}

console.log('TempStore: ' + tempFolder);

/** @namespace FS.TempStore
 * @property FS.TempStore
 * @type {object}
 */

// Make it an event emitter
FS.TempStore = new EventEmitter();

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

// Naming convention for file folder
_filePath = function(fileObj) {
  return path.join(tempFolder, fileObj._id + '.' + fileObj.collectionName);
};

// Naming convention for chunk files
_chunkPath = function(n) {
  return (n || 0) + '.chunk';
};

/**
 * @method FS.TempStore.exists
 * @param {FS.File} File object
 */
FS.TempStore.exists = function(fileObj) {
  if (fileObj.isMounted()) {
    return fs.existsSync(_filePath(fileObj));
  } else {
    // It cant be
    return false;
  }
};

FS.TempStore.listParts = function(fileObj) {
  var self = this;
  // List of missing chunks
  var partList = {};
  // File path
  var filePath = _filePath(fileObj);
  // We only start work if its found
  if (fs.existsSync( filePath )) {
    // Read all the chunks in folder
    chunkPaths = fs.readdirSync(filePath);
    // Unlink each file
    for (var i = 0; i < chunkPaths; i++) {
      // add part number to list
      partList[i] = i;
    }
  }
  // return the part list
  return partList;
};

FS.TempStore.removeFile = function(fileObj) {
  var self = this;
  // File path
  var filePath = _filePath(fileObj);
  // We only start work if its found
  if (fs.existsSync( filePath )) {
    // Emit event
    self.emit('remove', fileObj, filePath);
    // Read all the chunks in folder
    chunkPaths = fs.readdirSync(filePath);
    // Unlink each file
    for (var i = 0; i < chunkPaths.length; i++) {
      // Get the chunk path
      fs.unlinkSync(path.join(filePath, chunkPaths[i]));
    }
    // Unlink the folder itself
    fs.rmdirSync( filePath );
  }
};


// WRITE STREAM
FS.TempStore.createWriteStream = function(fileObj, options) {
  var self = this;

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
    // File path
    var filePath = _filePath(fileObj);

    // Make sure we have a place to put files...
    if (!fs.existsSync( filePath )) {
      try {
        fs.mkdirSync( filePath );
        self.emit('start', fileObj, chunk);
      } catch(err) {
        throw new Error('FS.Tempstore.createWriteStream cannot access temporary filesystem');
      }
    }

    // Find a nice location for the chunk data
    var chunkPath = path.join(filePath, _chunkPath(chunk));

    // Create the stream as Meteor safe stream
    var writeStream = FS.Utility.safeStream(fs.createWriteStream( chunkPath ) );

    // Check if its a new chunk
    // XXX: Deprecate not used
    var newChunk = !fs.existsSync(chunkPath);

    // When the stream closes we update the chunkCount
    writeStream.safeOn('close', function() {
      var chunkCount = fs.readdirSync(filePath).length;

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

  // Init current chunk pointer
  self.currentChunk = 0;

  // Init the sum of chunk
  self.chunkSum = fileObj.chunkSum;

  // Init the file path in temporary storage
  self.filePath = _filePath(fileObj);

};

// Add readable stream methods
util.inherits(_TempstoreReadStream, Readable);

// Create our custom read
// XXX: This could support read size if set
_TempstoreReadStream.prototype._read = function() {
  var self = this;

  if (self.currentChunk < self.chunkSum) {
    // Get the chunk path
    var chunkPath = path.join(self.filePath, _chunkPath(self.currentChunk++) );
    // Load chunk - we assume its there
    this.push(fs.readFileSync(chunkPath));
  } else {
    // Finish
    this.push(null);
  }

};

// Create a nice api handle
FS.TempStore.createReadStream = function(fileObj) {
  if (fileObj.isMounted()) {
    return new _TempstoreReadStream(fileObj);
  } else {
    throw new Error('FS.TempStore.createReadStream cannot work with unmounted file');
  }
};
