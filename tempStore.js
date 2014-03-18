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
  // Update the chunkCount on the fileObject
  fileObj.update({ $set: { chunkCount: count }});
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
FS.TempStore.createWriteStream = function(fileObj, chunk) {
  var self = this;

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

      if (typeof chunk === 'undefined') {

        // We created a writestream without chunk defined meaning this was used
        // as a regular createWriteStream method so we only stream to one chunk
        // file - 0.chunk - therefor setting the chunkCount and chunkSum to 1

        // Emit fileObj, current chunk and chunk count
        self.emit('progress', fileObj, 0, chunkCount);

        // We know this upload is complete - this could be a server transport
        self.emit('uploaded', fileObj, true); // set true marking "one stream"

      } else {
        // Progress
        self.emit('progress', fileObj, chunk, chunkCount);

        // Check if upload is completed
        if (chunkCount === fileObj.chunkSum) {
          self.emit('uploaded', fileObj);
        }

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
