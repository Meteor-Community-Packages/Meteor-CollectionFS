// Load data from a URL into a new FS.File and pass it to callback
// callback(err, fsFile)
FS.File.fromUrl = function(url, filename, callback) {
  callback = callback || defaultCallback;
  var fsFile = new FS.File({name: filename});
  fsFile.setDataFromUrl(url, function(err) {
    if (err) {
      callback(err);
    } else {
      callback(null, fsFile);
    }
  });
};

// Accepts a Blob object, sets the data into a new FS.File, and then
// passes the new FS.File to callback(err, fsFile)
FS.File.fromBlob = function(blob, filename, callback) {
  callback = callback || defaultCallback;
  if (typeof Blob !== "undefined" && blob instanceof Blob) {
    var fsFile = new FS.File({name: filename});
    fsFile.utime = new Date();
    fsFile.setDataFromBlob(blob, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, fsFile);
      }
    });
  } else {
    callback(new Error("FS.File.fromBlob requires a Blob object as the first argument"));
  }
};

// Accepts a File object, sets the data into a new FS.File, and then
// passes the new FS.File to callback(err, fsFile)
FS.File.fromFile = function(file, callback) {
  callback = callback || defaultCallback;
  if (typeof File !== "undefined" && file instanceof File) {
    var fsFile = new FS.File({name: file.name});
    fsFile.utime = file.lastModifiedDate;
    fsFile.setDataFromBlob(new Blob([file], {type: file.type}), function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, fsFile);
      }
    });
  } else {
    callback(new Error("FS.File.fromFile requires a File object as the first argument"));
  }
};

FS.File.prototype.saveLocal = function(filename) {
  var self = this;

  if (typeof window === "undefined")
    throw new Error("window must be defined to use saveLocal");

  window.saveAs(self.getBlob(), (filename || self.name));
};