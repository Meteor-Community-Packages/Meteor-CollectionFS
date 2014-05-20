/**
 * Notes a details about a storage adapter failure within the file record
 * @param {string} storeName
 * @param {number} maxTries
 * @return {undefined}
 * @todo deprecate this
 */
FS.File.prototype.logCopyFailure = function(storeName, maxTries) {
  var self = this;

  // hasStored will update from the fileRecord
  if (self.hasStored(storeName)) {
    throw new Error("logCopyFailure: invalid storeName");
  }

  // Make sure we have a temporary file saved since we will be
  // trying the save again.
  FS.TempStore.ensureForFile(self);

  var now = new Date;
  var currentCount = (self.failures && self.failures.copies && self.failures.copies[storeName] && typeof self.failures.copies[storeName].count === "number") ? self.failures.copies[storeName].count : 0;
  maxTries = maxTries || 5;

  var modifier = {};
  modifier.$set = {};
  modifier.$set['failures.copies.' + storeName + '.lastAttempt'] = now;
  if (currentCount === 0) {
    modifier.$set['failures.copies.' + storeName + '.firstAttempt'] = now;
  }
  modifier.$set['failures.copies.' + storeName + '.count'] = currentCount + 1;
  modifier.$set['failures.copies.' + storeName + '.doneTrying'] = (currentCount + 1 >= maxTries);
  self.update(modifier);
};

/**
 * Has this store permanently failed?
 * @param {String} storeName The name of the store
 * @return {boolean} Has this store failed permanently?
 * @todo deprecate this
 */
FS.File.prototype.failedPermanently = function(storeName) {
  var self = this;
  return !!(self.failures
          && self.failures.copies
          && self.failures.copies[storeName]
          && self.failures.copies[storeName].doneTrying);
};

/**
 * @method FS.File.prototype.createReadStream
 * @public
 * @param {String} [storeName]
 * @returns {stream.Readable} Readable NodeJS stream
 *
 * Returns a readable stream. Where the stream reads from depends on the FS.File instance and whether you pass a store name.
 *
 * * If you pass a `storeName`, a readable stream for the file data saved in that store is returned.
 * * If you don't pass a `storeName` and data is attached to the FS.File instance (on `data` property, which must be a DataMan instance), then a readable stream for the attached data is returned.
 * * If you don't pass a `storeName` and there is no data attached to the FS.File instance, a readable stream for the file data currently in the temporary store (`FS.TempStore`) is returned.
 *
 */
FS.File.prototype.createReadStream = function(storeName) {
  var self = this;

  // If we dont have a store name but got Buffer data?
  if (!storeName && self.data) {
    FS.debug && console.log("fileObj.createReadStream creating read stream for attached data");
    // Stream from attached data if present
    return self.data.createReadStream();
  } else if (!storeName && FS.TempStore && FS.TempStore.exists(self)) {
    FS.debug && console.log("fileObj.createReadStream creating read stream for temp store");
    // Stream from temp store - its a bit slower than regular streams?
    return FS.TempStore.createReadStream(self);
  } else {
    // Stream from the store using storage adapter
    if (self.isMounted()) {
      var storage = self.collection.storesLookup[storeName] || self.collection.primaryStore;
      FS.debug && console.log("fileObj.createReadStream creating read stream for store", storage.name);
      // return stream
      return storage.adapter.createReadStream(self);
    } else {
      throw new Meteor.Error('File not mounted');
    }

  }
};

/**
 * @method FS.File.prototype.createWriteStream
 * @public
 * @param {String} [storeName]
 * @returns {stream.Writeable} Writeable NodeJS stream
 *
 * Returns a writeable stream. Where the stream writes to depends on whether you pass in a store name.
 *
 * * If you pass a `storeName`, a writeable stream for (over)writing the file data in that store is returned.
 * * If you don't pass a `storeName`, a writeable stream for writing to the temp store for this file is returned.
 *
 */
FS.File.prototype.createWriteStream = function(storeName) {
  var self = this;

  // We have to have a mounted file in order for this to work
  if (self.isMounted()) {
    if (!storeName && FS.TempStore && FS.FileWorker) {
      // If we have worker installed - we pass the file to FS.TempStore
      // We dont need the storeName since all stores will be generated from
      // TempStore.
      // This should trigger FS.FileWorker at some point?
      FS.TempStore.createWriteStream(self);
    } else {
      // Stream directly to the store using storage adapter
      var storage = self.collection.storesLookup[storeName] || self.collection.primaryStore;
      return storage.adapter.createWriteStream(self);
    }
  } else {
    throw new Meteor.Error('File not mounted');
  }
};

Meteor.methods({
  // Does a HEAD request to URL to get the type, updatedAt, and size prior to actually downloading the data.
  // That way we can do filter checks without actually downloading.
  '_cfs_getUrlInfo': function (url) {
    this.unblock();

    var response = HTTP.call("HEAD", url);
    var headers = response.headers;
    var result = {};

    if (headers['content-type']) {
      result.type = headers['content-type'];
    }

    if (headers['content-length']) {
      result.size = +headers['content-length'];
    }

    if (headers['last-modified']) {
      result.updatedAt = new Date(headers['last-modified']);
    }

    return result;
  }
});
