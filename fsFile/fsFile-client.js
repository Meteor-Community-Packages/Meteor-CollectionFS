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

FS.File.prototype.saveLocal = function(filename) {
  var self = this;

  if (typeof window === "undefined")
    throw new Error("window must be defined to use saveLocal");

  window.saveAs(self.getBlob(), (filename || self.name));
};