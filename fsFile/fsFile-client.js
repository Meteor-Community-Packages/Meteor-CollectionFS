/** @method FS.File.fromUrl
 * @param {String} url
 * @param {String} filename
 * @param {Function} callback
 * @return {undefined}
 * 
 * Loads data from `url` into a new FS.File with `name = filename`,
 * and then passes the new FS.File instance to `callback(err, fsFile)`.
 * 
 */
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

/** @method FS.File.prototype.saveLocal
 * @param {String} [filename]
 * @return {undefined}
 * 
 * Tells the browser to save the file like a normal downloaded file,
 * using the provided filename, or the `name` property if `filename`
 * is not provided.
 * 
 */
FS.File.prototype.saveLocal = function(filename) {
  var self = this;

  if (typeof window === "undefined")
    throw new Error("window must be defined to use saveLocal");

  window.saveAs(self.getBlob(), (filename || self.name));
};

/** @method FS.File.prototype._get
  * @private
  */
FS.File.prototype._get = function(options) {
  var self = this;
  // On the client we download the file via transfer queue
  if (Meteor.isClient) {
    FS.downloadQueue.downloadFile(self, options.copyName);
  }
};