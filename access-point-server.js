var getHeaders = [];

FS.HTTP.setHeadersForGet = function setHeadersForGet(headers) {
  getHeaders = headers;
};

/**
 * @method FS.HTTP.publish
 * @public
 * @param {FS.Collection} collection
 * @param {Function} func - Publish function that returns a cursor.
 * @returns {undefined}
 * 
 * Publishes all documents returned by the cursor at a GET URL
 * with the format baseUrl/record/collectionName. The publish
 * function `this` is similar to normal `Meteor.publish`.
 */
FS.HTTP.publish = function fsHttpPublish(collection, func) {
  // Mount collection listing URL using http-publish package
  HTTP.publish(baseUrlForGetAndDel + '/record/' + collection.name, func);
};

/**
 * @method httpGetDelHandler
 * @private
 * @returns {any} response
 * 
 * HTTP GET and DEL request handler
 */
function httpGetDelHandler(data) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});

  var collectionName = opts.collectionName;
  var id = opts.id;
  var store = opts.store;
  var download = opts.download;
  var metadata = opts.metadata;

  // Get the collection
  var collection = FS._collections[collectionName];
  if (!collection) {
    throw new Meteor.Error(404, "Not Found", "No collection has the name " + collectionName);
  }

  // If no store was specified, use the first defined store
  if (typeof store !== "string") {
    store = collection.options.stores[0].name;
  }

  // Get the requested file
  var file = collection.findOne({_id: id});
  if (!file) {
    throw new Meteor.Error(404, "Not Found", 'There is no file with the id "' + id + '"');
  }

  file.getCollection(); // We can then call fileObj.collection

  // If DELETE request, validate with 'remove' allow/deny, delete the file, and return
  if (self.method.toLowerCase() === "delete") {
    FS.Utility.validateAction(file.collection.files._validators['remove'], file, self.userId);

    /*
     * From the DELETE spec:
     * A successful response SHOULD be 200 (OK) if the response includes an
     * entity describing the status, 202 (Accepted) if the action has not
     * yet been enacted, or 204 (No Content) if the action has been enacted
     * but the response does not include an entity.
     */
    self.setStatusCode(200);
    return {deleted: !!file.remove()};
  }

  // If we got this far, we're doing a GET

  // Once we have the file, we can test allow/deny validators
  FS.Utility.validateAction(file.collection._validators['download'], file, self.userId);

  var copyInfo = file.copies[store];

  // If metadata=true, return just the file's metadata as JSON
  if (metadata) {
    self.setStatusCode(200);
    return copyInfo;
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

  return file.get({
    storeName: store,
    start: start,
    end: end
  });
}

var currentHTTPMethodNames = [];
function unmountHTTPMethods() {
  if (currentHTTPMethodNames.length) {
    var methods = {};
    _.each(currentHTTPMethodNames, function(name) {
      methods[name] = false;
    });
    HTTP.methods(methods);
    currentHTTPMethodNames = [];
  }
}

mountUrls = function mountUrls() {
  // Unmount previously mounted URLs
  unmountHTTPMethods();

  // Construct URLs
  var url1 = baseUrlForGetAndDel + '/files/:collectionName/:id/:filename';
  var url2 = baseUrlForGetAndDel + '/files/:collectionName/:id';
  
  // TODO construct /record URLs, too

  // Mount URLs
  // TODO support HEAD request, possibly do it in http-methods package
  var methods = {};
  methods[url1] = {
    get: httpGetDelHandler,
    delete: httpGetDelHandler
  };
  methods[url2] = {
    get: httpGetDelHandler,
    delete: httpGetDelHandler
  };
  HTTP.methods(methods);

  // Cache names for potential future unmounting
  currentHTTPMethodNames.push(url1);
  currentHTTPMethodNames.push(url2);
};

// Initial mount
mountUrls();