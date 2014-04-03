getHeaders = [];

/**
 * @method httpDelHandler
 * @private
 * @returns {any} response
 *
 * HTTP DEL request handler
 */
httpDelHandler = function httpDelHandler(ref) {
  var self = this;
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});

  // If DELETE request, validate with 'remove' allow/deny, delete the file, and return
  FS.Utility.validateAction(ref.collection.files._validators['remove'], ref.file, self.userId);

  /*
   * From the DELETE spec:
   * A successful response SHOULD be 200 (OK) if the response includes an
   * entity describing the status, 202 (Accepted) if the action has not
   * yet been enacted, or 204 (No Content) if the action has been enacted
   * but the response does not include an entity.
   */
  self.setStatusCode(200);

  return {
    deleted: !!ref.file.remove()
  };
};

/**
 * @method httpGetHandler
 * @private
 * @returns {any} response
 *
 * HTTP GET request handler
 */
httpGetHandler = function httpGetHandler(ref) {
  var self = this;
  // Once we have the file, we can test allow/deny validators
  // XXX: pass on the "share" query eg. ?share=342hkjh23ggj for shared url access?
  FS.Utility.validateAction(ref.collection._validators['download'], ref.file, self.userId /*, self.query.shareId*/);

  var storeName = ref.storeName;

  // If no storeName was specified, use the first defined storeName
  if (typeof storeName !== "string") {
    // No store handed, we default to primary store
    storeName = ref.collection.primaryStore.name;
  }

  // Get the storage reference
  var storage = ref.collection.storesLookup[storeName];

  if (!storage) {
    throw new Meteor.Error(404, "Not Found", 'There is no store "' + storeName + '"');
  }

  // Get the file
  var copyInfo = ref.file.copies[storeName];

  if (!copyInfo) {
    throw new Meteor.Error(404, "Not Found", 'This file was not stored in the ' + storeName + ' store');
  }

  if (typeof copyInfo.type === "string") {
    self.setContentType(copyInfo.type);
  } else {
    self.setContentType('application/octet-stream');
  }

  // Add 'Content-Disposition' header if requested a download/attachment URL
  var start, end;
  if (typeof ref.download !== "undefined") {
    self.addHeader('Content-Disposition', 'attachment; filename="' + copyInfo.name + '"');

    // If a chunk/range was requested instead of the whole file, serve that
    var unit, range = self.requestHeaders.range;
    if (range) {
      // Parse range header
      range = range.split('=');

      unit = range[0];
      if (unit !== 'bytes')
        throw new Meteor.Error(416, "Requested Range Not Satisfiable");

      range = range[1];
      // Spec allows multiple ranges, but we will serve only the first
      range = range.split(',')[0];
      // Get start and end byte positions
      range = range.split('-');
      start = range[0];
      end = range[1] || '';
      // Convert to numbers and adjust invalid values when possible
      start = start.length ? Math.max(Number(start), 0) : 0;
      end = end.length ? Math.min(Number(end), copyInfo.size - 1) : copyInfo.size - 1;
      if (end < start)
        throw new Meteor.Error(416, "Requested Range Not Satisfiable");

      self.setStatusCode(206, 'Partial Content');
      self.addHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + copyInfo.size);
      end = end + 1; //HTTP end byte is inclusive and ours are not
    } else {
      self.setStatusCode(200);
    }
  } else {
    self.addHeader('Content-Disposition', 'inline');
    self.setStatusCode(200);
  }

  // Add any other custom headers
  // TODO support customizing headers per collection
  FS.Utility.each(getHeaders, function(header) {
    self.addHeader(header[0], header[1]);
  });

  // Inform clients that we accept ranges for resumable chunked downloads
  self.addHeader('Accept-Ranges', 'bytes');

  //ref.file.createReadStream(storeName).pipe(self.createWriteStream());
  var readStream = storage.adapter.createReadStream(ref.file);

  readStream.on('error', function(err) {
    // Send proper error message on get error
    if (err.message && err.statusCode) {
      self.Error(new Meteor.Error(err.statusCode, err.message));
    } else {
      self.Error(new Meteor.Error(503, 'Service unavailable'));
    }
  });
  readStream.pipe(self.createWriteStream());

};

httpPutInsertHandler = function httpPutInsertHandler(ref) {
  var self = this;
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});
  // Get filename if set
  var filename = opts.filename;
  // XXX: Get number of chunks?
  var chunkSum = opts.chunks;

  // Get chunk if set
  var chunk = parseInt(opts.chunk, 10);
  if (isNaN(chunk)) chunk = 0;

  FS.debug && console.log("HTTP PUT (insert) handler");

  // Create file object
  var fileDoc = {
    collectionName: ref.collection.name,
    // Get content type
    type: (self.requestHeaders['content-type'] || 'application/octet-stream'),
    // Set the filename if one was provided
    name: ''+(filename || ''),
    // Set chunkSize
    chunkSize: ref.collection.chunkSize,
    //
    chunkCount: 0,
    //
    chunkSum: chunkSum
  };

  // Validate with insert allow/deny
  FS.Utility.validateAction(ref.collection.files._validators['insert'], file, self.userId);

  // Get the new id for the file
  var id = ref.collection.files.insert(fileDoc);

  // Set the id in the doc for a complete file reference
  fileDoc._id = id;

  // Create the nice FS.File
  fileObj = new FS.File(fileDoc);

  // Pipe the data to tempstore...
  self.createReadStream().pipe( FS.TempStore.createWriteStream(fileObj, chunk) );

  // Insert file into collection, triggering readStream storage
  file = ref.collection.insert(file);

  // Send response
  self.setStatusCode(200);

  // Return the new file id
  return {_id: file._id};
};

httpPutUpdateHandler = function httpPutUpdateHandler(ref) {
  var self = this;
  var opts = FS.Utility.extend({}, self.query || {}, self.params || {});
  var chunk = parseInt(opts.chunk, 10);
  if (isNaN(chunk)) chunk = 0;

  FS.debug && console.log("HTTP PUT (update) handler received chunk: ", chunk);

  // Validate with insert allow/deny; also mounts and retrieves the file
  FS.Utility.validateAction(ref.collection.files._validators['insert'], ref.file, self.userId);

  self.createReadStream().pipe( FS.TempStore.createWriteStream(ref.file, chunk) );

  // Send response
  self.setStatusCode(200);

  return { _id: ref.file._id, chunk: chunk };
};
