// #Temporary Storage
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

fs = Npm.require('fs');
tmp = Npm.require('temp');

var storeCollection = new Meteor.Collection("fs.storage.temp");

/** @namespace FS.TempStore
  * @property FS.TempStore
  * @type {object}
  */
FS.TempStore = {

  /** @method FS.TempStore.saveChunk
    * @param {FS.File} fsFile
    * @param {Buffer} buffer
    * @param {number} start
    * @param {function} callback callback(err)
    * @todo In some ways it would make sense to save chunks into temp folder pr. file, naming the chunks `1.bin`, `2.bin` ... `n.bin`
    */
  saveChunk: function(fileObj, buffer, start, callback) {
    var total = buffer.length, tempFile, bytesChange;

    if (typeof callback !== "function") {
      throw new Error("FS.File.saveChunk requires a callback");
    }
    
    var existing = storeCollection.findOne({fileId: fileObj._id, collectionName: fileObj.collectionName, start: start});
    if (existing) {
      tempFile = existing.tempFile;
      bytesChange = 0;
    } else {
      // create it in the OS temp directory with a random unique name ending with ".bin"
      tempFile = tmp.path({suffix: '.bin'});
      FS.debug && console.log('Chunk saved ' + tempFile);
      // and make note of this file
      storeCollection.insert({
        fileId: fileObj._id,
        collectionName: fileObj.collectionName,
        start: start,
        size: total,
        tempFile: tempFile
      });
      bytesChange = total;
    }
    
    // Write the chunk data into the temporary file
    fs.writeFile(tempFile, buffer, Meteor.bindEnvironment(function(err) {
      if (err) {
        callback(err);
      } else {
        fileObj.update({$inc: {bytesUploaded: bytesChange}}, function(err) {
          callback(err); //don't pass along the second arg
        });
      }
    }, function(err) {
      callback(err);
    }));
  },

  /** @method FS.TempStore.getDataForFile
    * @param {FS.File} fileObj
    * @param {function} callback callback(err, fileObjWithData)
    * @todo This cannot handle large files eg. 2gb or more?
    */
  getDataForFile: function(fileObj, callback) {
    
    var existing = storeCollection.find({fileId: fileObj._id, collectionName: fileObj.collectionName});
    if (!existing.count()) {
      callback(new Error('getDataForFile: No temporary chunks!'));
      return;
    }
    
    existing.rewind();
    
    var tempBinary = EJSON.newBinary(fileObj.size);
    var total = 0, stop = false;
    existing.forEach(function (chunk) {
      if (!stop) {
        var start = chunk.start;
        // Call node readFile
        fs.readFile(chunk.tempFile, Meteor.bindEnvironment(function(err, buffer) {
          if (buffer) {
            // Copy chunk buffer into full file buffer at correct starting position
            for (var i = 0, ln = buffer.length; i < ln; i++) {
              tempBinary[start + i] = buffer[i];
              total++;
            }
            // If all chunks have been copied, set the fileObj
            // binary and call the callback
            if (total === fileObj.size) {
              fileObj.binary = tempBinary;
              callback(null, fileObj);
              stop = true;
            }
          } else {
            callback(err);
            stop = true;
          }
        }, function(err) {
          callback(err);
          stop = true;
        }));
      }
    });
  },

  /** @method FS.TempStore.deleteChunks
    * @param {FS.File} fileObj
    * @param {function} callback callback(err)
    */
  deleteChunks: function(fileObj, callback) {
    var stop = false, count, deletedCount = 0;
    callback = callback || FS.Utility.defaultCallback;
    
    var existing = storeCollection.find({fileId: fileObj._id, collectionName: fileObj.collectionName});

    if (!existing.count()) {
      callback();
      return;
    }

    function success() {
      deletedCount++;
      if (deletedCount === count) {
        storeCollection.remove({fileId: fileObj._id, collectionName: fileObj.collectionName});
        callback();
      }
    }
    
    existing.rewind();
    
    existing.forEach(function (chunk) {
      if (!stop) {
        if (!fs.existsSync(chunk.tempFile)) {
          success();
        } else {
          fs.unlink(chunk.tempFile, Meteor.bindEnvironment(function(err) {
            if (err) {
              callback(err);
              stop = true;
            } else {
              success();
            }
          }, function(err) {
            callback(err);
            stop = true;
          }));
        }
      }
    });
  },

  /** @method FS.TempStore.ensureForFile
    * @param {FS.File} fileObj
    * @param {function} callback callback(err)
    */
  ensureForFile: function (fileObj, callback) {
    callback = callback || FS.Utility.defaultCallback;
    FS.TempStore.saveChunk(fileObj, fileObj.getBuffer(), 0, callback);
  }
};

/** @method FS.TempStore.getDataForFileSync
  * @param {FS.File} fileObj
  * 
  * Synchronous version of FS.TempStore.getDataForFile. Returns the file
  * with data attached, or throws an error.
  */
FS.TempStore.getDataForFileSync = Meteor._wrapAsync(FS.TempStore.getDataForFile);