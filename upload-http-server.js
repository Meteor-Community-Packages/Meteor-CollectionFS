var path = Npm.require("path");

function httpPutInsertHandler(data) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});
  var filename = opts.filename;
  
  FS.debug && console.log("HTTP PUT handler");

  // Make sure the data we received is a buffer
  check(data, Buffer);

  // Get the collection
  var collection = FS._collections[params.collectionName];
  if (!collection) {
    throw new Meteor.Error(404, "Not Found", "No collection has the name " + params.collectionName);
  }

  // Create file object
  var file = new FS.File({
    collectionName: params.collectionName
  });

  // Set the filename if one was provided
  if (filename && filename.length) {
    file.name = filename;
  }

  // Validate with insert allow/deny
  FS.Utility.validateAction(collection.files._validators['insert'], file, self.userId);

  // Get content type
  var type = self.requestHeaders['content-type'] || 'application/octet-stream';

  // Attach data to file; this will set size and type properties for the file
  file.setDataFromBuffer(data, type);

  // Insert file into collection, triggering data storage
  file = collection.insert(file);

  // Send response
  self.setStatusCode(200);
  return {_id: file._id};
}

function httpPutUpdateHandler(data) {
  var self = this;
  var opts = _.extend({}, self.query || {}, self.params || {});
  var filename = opts.filename;

  // Make sure the data we received is a buffer
  check(data, Buffer);

  // Get the collection
  var collection = FS._collections[opts.collectionName];
  if (!collection) {
    throw new Meteor.Error(404, "Not Found", "No collection has the name " + opts.collectionName);
  }

  // Get the requested file
  var file = collection.findOne({_id: opts.id});
  if (!file) {
    throw new Meteor.Error(404, "Not Found", 'There is no file with the id "' + opts.id + '"');
  }
  
  // Get content type
  var type = self.requestHeaders['content-type'] || 'application/octet-stream';
  
  // TODO not working yet; need to overwrite the current file and/or the
  // current file metadata with new filename, content type, etc.

  var start = opts.start;
  if (typeof start !== "number")
    start = 0;

  // Validate with update allow/deny; also mounts and retrieves the file
  FS.Utility.validateAction(file.collection.files._validators['update'], file, self.userId);

  // Save chunk in temporary store
  FS.TempStore.saveChunk(file, FS.Utility.bufferToBinary(data), start, function(err) {
    if (err) {
      throw new Error("Unable to load binary chunk at position " + start + ": " + err.message);
    }
  });

  // Send response
  self.setStatusCode(200);
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
  var putUpdateUrl = baseUrlForUploads + '/:collectionName/:id';
  var putInsertUrl = baseUrlForUploads + '/:collectionName';

  // Mount URLs
  var methods = {};
  methods[putUpdateUrl] = {
    put: httpPutUpdateHandler
  };
  methods[putInsertUrl] = {
    put: httpPutInsertHandler
  };
  HTTP.methods(methods);

  // Cache names for potential future unmounting
  currentHTTPMethodNames.push(putUpdateUrl);
  currentHTTPMethodNames.push(putInsertUrl);
};

// Initial mount
mountUrls();