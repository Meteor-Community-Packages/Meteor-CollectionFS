getHeaders = [];

/**
 * @method httpGetDelHandler
 * @private
 * @returns {any} response
 *
 * HTTP GET and DEL request handler
 */
httpDelHandler = function httpGetDelHandler(data, ref) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});

  var store = opts.store;
  var download = opts.download;

  // If no store was specified, use the first defined store
  if (typeof store !== "string") {
    store = collection.options.stores[0].name;
  }

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
 * @method httpGetDelHandler
 * @private
 * @returns {any} response
 *
 * HTTP GET and DEL request handler
 */
httpGetHandler = function httpGetDelHandler(data, ref) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});

  var store = opts.store;
  var download = opts.download;

  // If no store was specified, use the first defined store
  if (typeof store !== "string") {
    store = ref.collection.options.stores[0].name;
  }

  // Once we have the file, we can test allow/deny validators
  FS.Utility.validateAction(ref.collection._validators['download'], ref.file, self.userId);

  var copyInfo = ref.file.copies[store];

  if (!copyInfo) {
    throw new Meteor.Error(404, "Not Found", 'This file was not stored in the ' + store + ' store or there is no store with that name');
  }

  if (typeof copyInfo.type === "string") {
    self.setContentType(copyInfo.type);
  } else {
    self.setContentType('application/octet-stream');
  }

  // Add 'Content-Disposition' header if requested a download/attachment URL
  var start, end;
  if (typeof download !== "undefined") {
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
  _.each(getHeaders, function(header) {
    self.addHeader(header[0], header[1]);
  });

  // Inform clients that we accept ranges for resumable chunked downloads
  self.addHeader('Accept-Ranges', 'bytes');

  return ref.file.get({
    storeName: store,
    start: start,
    end: end,
    format: 'buffer'
  });
};

httpPutInsertHandler = function httpPutInsertHandler(data, ref) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});
  var filename = opts.filename;

  FS.debug && console.log("HTTP PUT (insert) handler");

  // Make sure the data we received is a buffer
  check(data, Buffer);

  // Create file object
  var file = new FS.File({
    collectionName: ref.collection.name
  });

  // Set the filename if one was provided
  if (filename && filename.length) {
    file.name = filename;
  }

  // Validate with insert allow/deny
  FS.Utility.validateAction(ref.collection.files._validators['insert'], file, self.userId);

  // Get content type
  var type = self.requestHeaders['content-type'] || 'application/octet-stream';

  // Attach data to file; this will set size and type properties for the file
  file.setDataFromBuffer(data, type);

  // Insert file into collection, triggering data storage
  file = ref.collection.insert(file);

  // Send response
  self.setStatusCode(200);
  return {_id: file._id};
};

httpPutUpdateHandler = function httpPutUpdateHandler(data, ref) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});
  var start = parseInt(opts.start, 10);
  if (isNaN(start)) start = 0;

  // Make sure the data we received is a buffer
  check(data, Buffer);

  FS.debug && console.log("HTTP PUT (update) handler received", data.length, "bytes chunk for start position", start);


  // Validate with update allow/deny; also mounts and retrieves the file
  FS.Utility.validateAction(ref.collection.files._validators['update'], ref.file, self.userId);

  // Save chunk in temporary store
  FS.TempStore.saveChunk(ref.file, data, start, function(err) {
    if (err) {
      throw new Error("Unable to load chunk at position " + start + ": " + err.message);
    }
  });

  // Send response
  self.setStatusCode(200);
};
