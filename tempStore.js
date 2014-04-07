// ##Temporary Storage
//
// Temporary storage is used for chunked uploads until all chunks are received
// and all copies have been made or given up. In some cases, the original file
// is stored only in temporary storage (for example, if all copies do some
// manipulation in beforeSave). This is why we use the temporary file as the
// basis for each saved copy, and then remove it after all copies are saved.
//
// Every chunk is saved as an individual temporary file. This is safer than
// attempting to write multiple incoming chunks to different positions in a
// single temporary file, which can lead to write conflicts.
//
// Using temp files also allows us to easily resume uploads, even if the server
// restarts, and to keep the working memory clear.

// The FS.TempStore emits events that others are able to listen to
var EventEmitter = Npm.require('events').EventEmitter;

// We have a special stream concating all chunk files into one readable stream
var Readable = Npm.require('stream').Readable;
var util = Npm.require('util');


/** @namespace FS.TempStore
 * @property FS.TempStore
 * @type {object}
 * @public
 * *it's an event emitter*
 */

FS.TempStore = new EventEmitter();

/**
 * @property FS.TempStore.Storage
 * @type {StorageAdapter}
 * @namespace FS.TempStore
 * @private
 * This property is set to either `FS.Store.FileSystem` or `FS.Store.GridFS`
 *
 * __When and why:__
 * We normally default to `cfs-filesystem` unless its not installed. *(we default to gridfs if installed)*
 * But if `cfs-gridfs` and `cfs-worker` is installed we default to `cfs-gridfs`
 *
 * If `cfs-gridfs` and `cfs-filesystem` is not installed we log a warning.
 * the user can set `FS.TempStore.Storage` them selfs eg.:
 * ```js
 *   // Its important to set `internal: true` this lets the SA know that we
 *   // are using this internally and it will give us direct SA api
 *   FS.TempStore.Storage = new FS.Store.GridFS('_tempstore', { internal: true });
 * ```
 *
 * > Note: This is considered as `advanced` use, its not a common pattern.
 */
FS.TempStore.Storage = null;

// XXX: Temp fix
var workaroundGridFS = false;

// We will not mount a storage adapter until needed. This allows us to check for the
// existance of FS.FileWorker, which is loaded after this package because it
// depends on this package.
function mountStorage() {

  if (FS.TempStore.Storage) return;

  if (FS.Store.GridFS && (FS.FileWorker || !FS.Store.FileSystem)) {
    // If the file worker is installed we would prefer to use the gridfs sa
    // for scalability. We also default to gridfs if filesystem is not found

    // Use the gridfs
    FS.TempStore.Storage = new FS.Store.GridFS('_tempstore', { internal: true });
    // XXX: Temp fix
    workaroundGridFS = true;
  } else if (FS.Store.FileSystem) {
    // use the Filesystem
    FS.TempStore.Storage = new FS.Store.FileSystem('_tempstore', { internal: true });
  } else {
    throw new Error('FS.TempStore.Storage is not set: Install cfs-filesystem or cfs-gridfs or set it manually');
  }

  FS.debug && console.log('TempStore is mounted on', FS.TempStore.Storage.typeName);
}

function mountFile(fileObj, name) {
  if (!fileObj.isMounted()) {
    throw new Error(name + ' cannot work with unmounted file');
  }
}

// We update the fileObj on progress
FS.TempStore.on('progress', function(fileObj, chunk, count) {
  // Update the chunk counter
  var modifier;

  // Check if all chunks are uploaded
  if (count === (fileObj.chunkSum || 1) ) {
    // We no longer need the chunk info
    // TODO TempStore should have a collection for tracking the number of chunks per file so we don't need to rely on the fileObj.chunkSum
    // modifier = { $set: {}, $unset: {chunkCount: 1, chunkSum: 1, chunkSize: 1} };
    modifier = { $set: {}, $unset: {chunkCount: 1, chunkSize: 1} };

    // Check if the file has been uploaded before
    if (typeof fileObj.uploadedAt === 'undefined') {
      // We set the uploadedAt date
      modifier.$set.uploadedAt = new Date();
    } else {
      // We have been uploaded so an event were file data is updated is
      // called synchronizing - so this must be a synchronizedAt?
      modifier.$set.synchronizedAt = new Date();
    }
  } else {
    modifier = { $set: {chunkCount: count} };
  }

  // Update the chunkCount on the fileObject
  fileObj.update(modifier);
});

// XXX: TODO
// FS.TempStore.on('stored', function(fileObj, chunkCount, result) {
//   // This should work if we pass on result from the SA on stored event...
//   fileObj.update({ $set: { chunkSum: 1, chunkCount: chunkCount, size: result.size } });
// });


  // FS.TempStore.on('uploaded', function(fileObj, inOneStream) {
  //   console.log(fileObj.name + ' is uploaded!!');
  // });

// Stream implementation

// XXX: Would be nice if we could just use the meteor id directly in the mongodb
// It should be possible?
var UNMISTAKABLE_CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz";

var UNMISTAKABLE_CHARS_LOOKUP = {};
for (var a = 0; a < UNMISTAKABLE_CHARS.length; a++) {
  UNMISTAKABLE_CHARS_LOOKUP[UNMISTAKABLE_CHARS[a]] = a;
}

var meteorToMongoId = function(meteorId, chunk) {
  var unit = UNMISTAKABLE_CHARS.length;
  var index = 1;
  result = 0;
  for (var i = 0; i < meteorId.length; i++) {
    if (typeof UNMISTAKABLE_CHARS_LOOKUP[meteorId[i]] !== 'undefined') {
      // Add the number at index
      result += UNMISTAKABLE_CHARS_LOOKUP[meteorId[i]] * index;
      // Inc index by ^unit
      index *= unit;
    } else {
      throw new Error('Not a meteor ID');
    }
  }

  // Inc by ^unit
  result += chunk * index;

  // convert to hex
  result = result.toString(16).substring(0, 24);

  return result;
};

/**
 * @method _chunkPath
 * @private
 * @param {Number} [n] Chunk number
 * @returns {String} Chunk naming convention
 */
_chunkPath = function(n) {
  return (n || 0) + '.chunk';
};

/**
 * @method _fileReference
 * @param {FS.File} fileObj
 * @param {Number} chunk
 * @private
 * @returns {String} Generated SA specific fileKey for the chunk
 *
 * Note: Calling function should call mountStorage() first, and
 * make sure that fileObj is mounted.
 */
_fileReference = function(fileObj, chunk) {
  // Return a fitting fileKey SA specific
  return FS.TempStore.Storage.adapter.fileKey({
    collectionName: fileObj.collectionName,
    _id: fileObj._id,
    name: _chunkPath(chunk),
    // Temp workaround, we generate a unik id for the gridFS SA
    mongoId: workaroundGridFS && meteorToMongoId(fileObj._id, chunk)
  });
};

/**
 * @method FS.TempStore.exists
 * @param {FS.File} File object
 * @todo This is not yet implemented, milestone 1.1.0
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

/**
 * @method FS.TempStore.listParts
 * @param {FS.File} fileObj
 * @returns {Object} of parts already stored
 * @todo This is not yet implemented, milestone 1.1.0
 */
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

/**
 * @method FS.TempStore.removeFile
 * @public
 * @param {FS.File} fileObj
 * This function removes the file from tempstorage - it cares not if file is
 * already removed or not found, goal is reached anyway.
 */
FS.TempStore.removeFile = function(fileObj) {
  var self = this;

  // Ensure that we have a storage adapter mounted; if not, throw an error.
  mountStorage();

  // If fileObj is not mounted or can't be, throw an error
  mountFile(fileObj, 'FS.TempStore.removeFile');

  // Emit event
  self.emit('remove', fileObj);

  // Unlink each file
  // TODO TempStore should have a collection for tracking the number of chunks per file so we don't need to rely on the fileObj.chunkSum
  for (var i = 0; i < fileObj.chunkSum; i++) {
    // Get the chunk path
    FS.TempStore.Storage.adapter.remove( _fileReference(fileObj, i), FS.Utility.noop);
  }
};

/**
 * @method FS.TempStore.createWriteStream
 * @public
 * @param {FS.File} fileObj File to store in temporary storage
 * @param {Number | String} [options]
 * @returns {Stream} Writeable stream
 *
 * `options` of different types mean differnt things:
 * * `undefined` We store the file in one part
 * *(Normal server-side api usage)*
 * * `Number` the number is the part number total is `fileObj.chunkSum`
 * *(multipart uploads will use this api)*
 * * `String` the string is the name of the `store` that wants to store file data
 * *(stores that want to sync their data to the rest of the files stores will use this)*
 *
 * > Note: fileObj must be mounted on a `FS.Collection`, it makes no sense to store otherwise
 */
FS.TempStore.createWriteStream = function(fileObj, options) {
  var self = this;

  // Ensure that we have a storage adapter mounted; if not, throw an error.
  mountStorage();

  // If fileObj is not mounted or can't be, throw an error
  mountFile(fileObj, 'FS.TempStore.createWriteStream');

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

  // Find a nice location for the chunk data
  var chunkReference = _fileReference(fileObj, chunk);

  // Create the stream as Meteor safe stream
  var writeStream = FS.TempStore.Storage.adapter.createWriteStream( chunkReference );

  // When the stream closes we update the chunkCount
  writeStream.safeOn('stored', function(result) {
    // var chunkCount = fs.readdirSync(filePath).length;
    // XXX: We should track this in a collection to keep track of chunks
    // This could fail if a chunk is uploaded twice...
    var chunkCount = fileObj.chunkCount + 1;
    var done = (chunkCount === fileObj.chunkSum); // check this here since the 'progress' event handler will delete the chunkSum prop

    // Progress
    self.emit('progress', fileObj, chunk, chunkCount, result);

    if (options === +options) {
      // options is number - this is a chunked upload

      // If upload is completed, fire events
      if (done) {
        self.emit('stored', fileObj, result);
        self.emit('ready', fileObj, chunkCount, result);
      }

    } else if (options === ''+options) {
      // options is a string - so we are passed the name of syncronizing SA
      self.emit('synchronized', fileObj, options, result);
      self.emit('ready', fileObj, options, result);

    } else if (typeof options === 'undefined') {
      // options is not defined - this is direct use of server api

      // We created a writestream without chunk defined meaning this was used
      // as a regular createWriteStream method so we only stream to one chunk
      // file - 0.chunk - therefor setting the chunkCount and chunkSum to 1


      // We know this upload is complete - this could be a server transport
      // set true marking "one stream" since chunk number is not defined
      // we assume that we are accessed by others than the Access Point /
      // file upload - This could be server streaming or client direct uploads
      // XXX: we should pass size?
      self.emit('uploaded', fileObj /*, size */);
      self.emit('ready', fileObj /*, size */);

    } else {
      throw new Error('FS.TempStore.createWriteStream got unexpected type in options');
    }
  });

  return writeStream;
};

// READSTREAM

/**
  * @method FS.TempStore.createReadStream
  * @param {FS.File} fileObj The file to read
  * @private
  * @return {Stream} Returns readable stream
  *
  * > Note: This is the true streaming object wrapped by the public api
  */
_TempstoreReadStream = function(fileObj, options) {
  var self = this;
  Readable.call(this, options);

  self.fileObj = fileObj;

  // Init current chunk pointer
  self.currentChunk = 0;

  // Init the sum of chunk
  // TODO TempStore should have a collection for tracking the number of chunks per file so we don't need to rely on the fileObj.chunkSum
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

    FS.debug && console.log('READ CHUNK: ' + self.currentChunk);
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

/**
  * @method FS.TempStore.createReadStream
  * @public
  * @param {FS.File} fileObj The file to read
  * @return {Stream} Returns readable stream
  *
  */
FS.TempStore.createReadStream = function(fileObj) {
  // Ensure that we have a storage adapter mounted; if not, throw an error.
  mountStorage();

  // If fileObj is not mounted or can't be, throw an error
  mountFile(fileObj, 'FS.TempStore.createReadStream');

  return new _TempstoreReadStream(fileObj);
};
