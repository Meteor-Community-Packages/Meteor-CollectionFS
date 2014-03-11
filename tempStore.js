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

var Readable = Npm.require('stream').Readable;
var util = Npm.require('util');

var storeCollection = new Meteor.Collection("cfs.tempstore");

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
FS.TempStore = {};

// Stream implementation

// Naming convention for file folder
_filePath = function(fileObj) {
  return fileObj._id + '.' + fileObj.collectionName;
};

// Naming convention for chunk files
_chunkPath = function(n) {
  return n + '.chunk';
};

FS.TempStore.removeFile = function(fileObj) {
  var self = this;
  // File path
  var filePath = _filePath(fileObj);
  // We only start work if its found
  if (fs.existsSync( filePath )) {
    // Read all the chunks in folder
    chunkPaths = fs.readdirSync(_filePath(fileObj) );
    // Unlink each file
    for (var i = 0; i < chunkPaths; i++) {
      fs.unlinkSync( chunkPaths[i] );
    }
    // Unlink the folder itself
    fs.rmdirSync( filePath );
  }

};

// WRITE STREAM
FS.TempStore.createWriteStream = function(fileObj, chunk) {
  var self = this;
  // File path
  var filePath = _filePath(fileObj);

  // Make sure we have a place to put files...
  if (!fs.existsSync( filePath )) {
    try {
      fs.mkdirSync( filePath );
    } catch(err) {
      throw new Error('FS.Tempstore.createWriteStream cannot access temporary filesystem');
    }
  }

  // Find a nice location for the chunk data
  var filePath = path.join(filePath, _chunkPath(chunk));

  // Create the stream as Meteor safe stream
  var writeStream = FS.Utility.safeStream(fs.createWriteStream( filePath ) );

  // When the stream closes we update the chunkCount
  writeStream.safeOn('close', function() {
    // Progress
    fileObj.update({ $inc: { chunkCount: 1 }});
  });

  return writeStream;
};

// READSTREAM
_TempstoreReadStream = function(fileObj, options) {
  var self = this;
  Readable.call(this, options);

  self.currentChunk = 0;
  self.chunkSum = fileObj.chunkSum;

  self.filePath = _filePath(fileObj);
};

util.inherits(_TempstoreReadStream, Readable);

_TempstoreReadStream.prototype._read = function() {
  var self = this;

  if (self.currentChunk < self.chunkSum) {
    // Get the chunk path
    var chunkPath = path.join(self.filePath, _chunkPath(self.currentChunk++) );
    // Load chunk - we assume its there
    this.push(fs.readFileSync(chunkPath));
  } else {
    this.push(null);
  }

};


FS.TempStore.createReadStream = function(fileObj) {
  return new _TempstoreReadStream(fileObj);
};
