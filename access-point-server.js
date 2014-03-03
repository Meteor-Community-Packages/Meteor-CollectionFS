var path = Npm.require("path");

HTTP.publishFormats({
  fileRecordFormat: function (input) {
    // Set the method scope content type to json
    this.setContentType('application/json');
    if (_.isArray(input)) {
      return EJSON.stringify(_.map(input, function (obj) {
        return FS.Utility.cloneFileRecord(obj);
      }));
    } else {
      return EJSON.stringify(FS.Utility.cloneFileRecord(input));
    }
  }
});

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
  var name = baseUrl + '/record/' + collection.name;
  // Mount collection listing URL using http-publish package
  HTTP.publish({
    name: name,
    defaultFormat: 'fileRecordFormat',
    collection: collection,
    collectionGet: true,
    collectionPost: false,
    documentGet: true,
    documentPut: false,
    documentDelete: false
  }, func);
  
  FS.debug && console.log("Registered HTTP method GET URLs:\n\n" + name + '\n' + name + '/:id\n');
};

/**
 * @method FS.HTTP.unpublish
 * @public
 * @param {FS.Collection} collection
 * @returns {undefined}
 * 
 * Unpublishes a restpoint created by a call to `FS.HTTP.publish`
 */
FS.HTTP.unpublish = function fsHttpUnpublish(collection) {
  // Mount collection listing URL using http-publish package
  HTTP.unpublish(baseUrl + '/record/' + collection.name);
};

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
  var url1 = baseUrl + '/files/:collectionName/:id/:filename';
  var url2 = baseUrl + '/files/:collectionName/:id';
  var url3 = baseUrl + '/files/:collectionName';
  var url4 = baseUrl + '/record/:collectionName/:id/:filename'; //for DELETE only
  var url5 = baseUrl + '/record/:collectionName/:id'; //for DELETE only

  // Mount URLs
  // TODO support HEAD request, possibly do it in http-methods package
  var methods = {};
  methods[url1] = {
    get: httpGetDelHandler,
    delete: httpGetDelHandler,
    put: httpPutUpdateHandler
  };
  methods[url2] = {
    get: httpGetDelHandler,
    delete: httpGetDelHandler,
    put: httpPutUpdateHandler
  };
  methods[url3] = {
    put: httpPutInsertHandler
  };
  methods[url4] = {
    delete: httpGetDelHandler
  };
  methods[url5] = {
    delete: httpGetDelHandler
  };
  HTTP.methods(methods);

  // Cache names for potential future unmounting
  currentHTTPMethodNames = currentHTTPMethodNames.concat([url1, url2, url3, url4, url5]);
};

// Initial mount
mountUrls();

Meteor.startup(function () {
  FS.debug && console.log("Registered HTTP method URLs:\n\n" + currentHTTPMethodNames.join('\n') + '\n');
});