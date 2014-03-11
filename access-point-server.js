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

var _existingMountPoints = {};

/**
 * @method defaultSelectorFunction
 * @private
 * @returns { collection, file }
 *
 * This is the default selector function
 */
var defaultSelectorFunction = function() {
  var self = this;
  // Selector function
  //
  // This function will have to return the collection and the
  // file. If file not found undefined is returned - if null is returned the
  // search was not possible
  var opts = _.extend({}, self.query || {}, self.params || {});

  // Get the collection name from the url
  var collectionName = opts.collectionName;

  // Get the id from the url
  var id = opts.id;

  // Get the collection
  var collection = FS._collections[collectionName];

  // Get the file if possible else return null
  var file = (id && collection)? collection.findOne({ _id: id }): null;

  // Return the collection and the file
  return {
    collection: collection,
    file: file,
    storeName: opts.store,
    download: opts.download
  };
};

/*
 * @method FS.HTTP.mount
 * @public
 * @param {array of string} mountPoints mount points to map rest functinality on
 * @param {function} selector_f [selector] function returns `{ collection, file }` for mount points to work with
 *
*/
FS.HTTP.mount = function(mountPoints, selector_f) {
  // We take mount points as an array and we get a selector function
  var selectorFunction = selector_f || defaultSelectorFunction;

  var accessPoint = {
    'stream': true,
    'post': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selectorFunction.call(this);

      // We dont support post - this would be normal insert eg. of filerecord?
      throw new Meteor.Error(501, "Not implemented", "Post is not supported");
    },
    'put': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selectorFunction.call(this);

      // Make sure we have a collection reference
      if (!ref.collection)
        throw new Meteor.Error(404, "Not Found", "No collection found");

      // Make sure we have a file reference
      if (ref.file === null) {
        // No id supplied so we will return the published list of files ala
        // http.publish in json format?
        console.log('PUT without file id??');
        return httpPutInsertHandler.apply(this, [data, ref]);
      } else {
        if (ref.file) {
          return httpPutUpdateHandler.apply(this, [data, ref]);
        } else {
          throw new Meteor.Error(404, "Not Found", 'No file found');
        }
      }
    },
    'get': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selectorFunction.call(this);

      // Make sure we have a collection reference
      if (!ref.collection)
        throw new Meteor.Error(404, "Not Found", "No collection found");

      // Make sure we have a file reference
      if (ref.file === null) {
        // No id supplied so we will return the published list of files ala
        // http.publish in json format?
        return httpGetListHandler.apply(this, [ref]);
      } else {
        if (ref.file) {
          return httpGetHandler.apply(this, [ref]);
        } else {
          throw new Meteor.Error(404, "Not Found", 'No file found');
        }
      }
    },
    'delete': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selectorFunction.call(this);

      // Make sure we have a collection reference
      if (!ref.collection)
        throw new Meteor.Error(404, "Not Found", "No collection found");

      // Make sure we have a file reference
      if (ref.file) {
        return httpDelHandler.apply(this, [ref]);
      } else {
        throw new Meteor.Error(404, "Not Found", 'No file found');
      }
    }
  };

  var accessPoints = {};

  // Add debug message
  FS.debug && console.log('Registered HTTP method URLs:');

  _.each(mountPoints, function(mountPoint) {
    // Couple mountpoint and accesspoint
    accessPoints[mountPoint] = accessPoint;
    // Remember our mountpoints
    _existingMountPoints[mountPoint] = mountPoint;
    // Add debug message
    FS.debug && console.log(mountPoint);
  });

  // XXX: HTTP:methods should unmount existing mounts in case of overwriting?d
  HTTP.methods(accessPoints);

};

/**
 * @method FS.HTTP.unmount
 * @public
 * @param {string | array of string} [mountPoints] Optional, if not specified all mountpoints are unmounted
 *
 */
FS.HTTP.unmount = function(mountPoints) {
  // The mountPoints is optional, can be string or array if undefined then
  // _existingMountPoints will be used
  var unmountList;
  // Container for the mount points to unmount
  var unmountPoints = {};

  if (typeof mountPoints === 'undefined') {
    // Use existing mount points - unmount all
    unmountList = _existingMountPoints;
  } else if (mountPoints === ''+mountPoints) {
    // Got a string
    unmountList = [mountPoints];
  } else if (mountPoints.length) {
    // Got an array
    unmountList = mountPoints;
  }

  // If we have a list to unmount
  if (unmountList) {
    // Iterate over each item
    _.each(unmountList, function(mountPoint) {
      // Check _existingMountPoints to make sure the mount point exists in our
      // context / was created by the FS.HTTP.mount
      if (_existingMountPoints[mountPoint]) {
        // Mark as unmount
        unmountPoints[mountPoint] = false;
        // Release
        delete _existingMountPoints[mountPoint];
      }
    });
    FS.debug && console.log('FS.HTTP.unmount:');
    FS.debug && console.log(unmountPoints);
    // Complete unmount
    HTTP.methods(unmountPoints);
  }
};

// ### FS.Collection maps on HTTP pr. default on the following restpoints:
// *
//    baseUrl + '/files/:collectionName/:id/:filename',
//    baseUrl + '/files/:collectionName/:id',
//    baseUrl + '/files/:collectionName'
//
// Change/ replace the existing mount point by:
// ```js
//   // unmount all existing
//   FS.HTTP.unmount();
//   // Create new mount point
//   FS.HTTP.mount([
//    '/cfs/files/:collectionName/:id/:filename',
//    '/cfs/files/:collectionName/:id',
//    '/cfs/files/:collectionName'
//  ]);
//  ```
//
Meteor.startup(function () {

  // Start up the basic mount points
  FS.HTTP.mount([
    baseUrl + '/files/:collectionName/:id/:filename',
    baseUrl + '/files/:collectionName/:id',
    baseUrl + '/files/:collectionName'
  ]);

  // FS.debug && console.log("Registered HTTP method URLs:\n\n" + currentHTTPMethodNames.join('\n') + '\n');
});
