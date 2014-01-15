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

//   tmp = Npm.require('temp');

/** @namespace TempStore
  * @property TempStore
  * @type {object}
  */
TempStore = {
  
  /** @method TempStore.saveChunk
    * @param {FS.File} fsFile
    * @param {binary} binary
    * @param {number} start
    * @param {function} callback callback(err, allBytesLoaded)
    */
  saveChunk: function(fileObj, binary, start, callback) {
    var total = binary.length;

    if (typeof callback !== "function") {
      throw new Error("FS.File.saveChunk requires a callback");
    }

    var chunks = fileObj.chunks || [], chunk, tempFile;
    for (var i = 0, ln = chunks.length; i < ln; i++) {
      chunk = chunks[i];
      if (chunk.start === start) {
        tempFile = chunk.tempFile;
        break;
      }
    }
    if (!tempFile) {
      tempFile = tmp.path({suffix: '.bin'});
      fileObj.update({$push: {chunks: {start: start, tempFile: tempFile}}});
    }
    // Call node writeFile
    fs.writeFile(tempFile, binaryToBuffer(binary), Meteor.bindEnvironment(function(err) {
      if (err) {
        callback(err);
      } else {
        fileObj.update({$inc: {bytesUploaded: total}}, function(err, count) {
          if (err) {
            callback(err);
          } else {
            // We pull the fileRecord to make sure all the data chunks have been
            // recieved - We have to pull the record on the server-side
            if (count > 0) fileObj.getFileRecord();
            console.log("Uploaded " + fileObj.bytesUploaded + " of " + fileObj.size + " bytes");

            if (fileObj.bytesUploaded === fileObj.size) {
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
    * @param {FS.File} fileObj
    * @param {function} callback callback(err, fileObjWithData)
    */  
  getDataForFile: function(fileObj, callback) {
    fileObj.binary = EJSON.newBinary(fileObj.size);
    var total = 0, stop = false;
    _.each(fileObj.chunks, function(chunk) {
      if (!stop) {
        var start = chunk.start;
        // Call node readFile
        fs.readFile(chunk.tempFile, Meteor.bindEnvironment(function(err, buffer) {
          if (buffer) {
            for (var i = 0, ln = buffer.length; i < ln; i++) {
              fileObj.binary[start + i] = buffer[i];
              total++;
            }
            if (total === fileObj.size) {
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
  
  /** @method TempStore.deleteChunks
    * @param {FS.File} fileObj
    * @param {function} callback callback(err)
    */
  deleteChunks: function(fileObj, callback) {
    var stop = false, count, deletedCount = 0;
    callback = callback || defaultCallback;

    if (!fileObj.chunks) {
      callback();
      return;
    }

    var count = fileObj.chunks.length;
    if (!count) {
      callback();
      return;
    }

    function success() {
      deletedCount++;
      if (deletedCount === count) {
        fileObj.update({$unset: {chunks: 1}});
        callback();
      }
    }

    _.each(fileObj.chunks, function(chunk) {
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
    * @param {FS.File} fileObj
    * @param {function} callback callback(err, allBytesLoaded)
    */  
  ensureForFile: function (fileObj, callback) {
    callback = callback || defaultCallback;
    fileObj.getBinary(null, null, function (err, binary) {
      if (err) {
        callback(err);
      } else {
        TempStore.saveChunk(fileObj, binary, 0, callback);
      }
    });
  }
};