/** @method FS.File.prototype.saveLocal
 * @public
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
    FS.downloadQueue.downloadFile(self, options.storeName);
  }
};
