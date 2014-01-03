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
 
/** @namespace TempStore
  * @property TempStore
  * @type {object}
  */
TempStore = {
  
  /** @method TempStore.saveChunk
    * @param {FS.File} fsFile
    * @param {binary} binary
    * @param {number} start
    * @param {function} callback(err, allBytesLoaded)
    */
  saveChunk: function(fsFile, binary, start, callback) {
    var total = binary.length;

    if (typeof callback !== "function") {
      throw new Error("FS.File.saveChunk requires a callback");
    }

    var chunks = fsFile.chunks || [], chunk, tempFile;
    for (var i = 0, ln = chunks.length; i < ln; i++) {
      chunk = chunks[i];
      if (chunk.start === start) {
        tempFile = chunk.tempFile;
        break;
      }
    }
    if (!tempFile) {
      tempFile = tmp.path({suffix: '.bin'});
      fsFile.update({$push: {chunks: {start: start, tempFile: tempFile}}});
    }

    // Call node writeFile
    fs.writeFile(tempFile, binaryToBuffer(binary), Meteor.bindEnvironment(function(err) {
      if (err) {
        callback(err);
      } else {
        fsFile.update({$inc: {bytesUploaded: total}}, function(err) {
          if (err) {
            callback(err);
          } else {
            console.log("Uploaded " + fsFile.bytesUploaded + " of " + fsFile.size + " bytes");
            if (fsFile.bytesUploaded === fsFile.size) {
              // We are done loading all bytes
              callback(null, true);
            }
          }
        });
      }
    }, function(err) {
      callback(err);
    }));
  },

  /** @method TempStore.getDataForFile
    * @param {FS.File} fsFile
    * @param {function} callback(err, fsFileWithData)
    */  
  getDataForFile: function(fsFile, callback) {
    fsFile.binary = EJSON.newBinary(fsFile.size);
    var total = 0, stop = false;
    _.each(fsFile.chunks, function(chunk) {
      if (!stop) {
        var start = chunk.start;
        // Call node readFile
        fs.readFile(chunk.tempFile, Meteor.bindEnvironment(function(err, buffer) {
          if (buffer) {
            for (var i = 0, ln = buffer.length; i < ln; i++) {
              fsFile.binary[start + i] = buffer[i];
              total++;
            }
            if (total === fsFile.size) {
              callback(null, fsFile);
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
  
  /** @method TempStore.deleteChunks
    * @param {FS.File} fsFile
    * @param {function} callback(err)
    */
  deleteChunks: function(fsFile, callback) {
    var stop = false, count, deletedCount = 0;
    
    callback = callback || defaultCallback;

    if (!fsFile.chunks) {
      callback();
      return;
    }

    var count = fsFile.chunks.length;
    if (!count) {
      callback();
      return;
    }

    function success() {
      deletedCount++;
      if (deletedCount === count) {
        fsFile.update({$unset: {chunks: 1}});
        callback();
      }
    }

    _.each(fsFile.chunks, function(chunk) {
      if (!fs.existsSync(chunk.tempFile)) {
        success();
      } else if (!stop) {
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
    });
  },
  
  /** @method TempStore.ensureForFile
    * @param {FS.File} fsFile
    * @param {function} callback(err, allBytesLoaded)
    */  
  ensureForFile: function (fsFile, callback) {
    callback = callback || defaultCallback;
    fsFile.getBinary(null, null, function (err, binary) {
      if (err) {
        callback(err);
      } else {
        TempStore.saveChunk(fsFile, binary, 0, callback);
      }
    });
  }
};