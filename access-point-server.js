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


/*
  @param
  @param {function} selector_f is a function that simply returns the collection and file
  @return {object} the collection and file if not found then undefined if search not possible then return null
*/
FS.HTTP.mount = function(mountPoints, selector_f) {
  // We take mount points as an array and we get a selector function

  var accessPoint = {
    'post': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selector_f.apply(this, [data]);

      // We dont support post - this would be normal insert eg. of filerecord?
      throw new Meteor.Error(501, "Not implemented", "Post is not supported");
    },
    'put': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selector_f.apply(this, [data]);

      // Make sure we have a collection reference
      if (!ref.collection)
        throw new Meteor.Error(404, "Not Found", "No collection found");

      // Make sure we have a file reference
      if (ref.file === null) {
        // No id supplied so we will return the published list of files ala
        // http.publish in json format?
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
      var ref = selector_f.apply(this, [data]);

      // Make sure we have a collection reference
      if (!ref.collection)
        throw new Meteor.Error(404, "Not Found", "No collection found");

      // Make sure we have a file reference
      if (ref.file === null) {
        // No id supplied so we will return the published list of files ala
        // http.publish in json format?
        return httpGetListHandler.apply(this, [data, ref]);
      } else {
        if (ref.file) {
          return httpGetHandler.apply(this, [data, ref]);
        } else {
          throw new Meteor.Error(404, "Not Found", 'No file found');
        }
      }
    },
    'delete': function(data) {
      // Use the selector for finding the collection and file reference
      var ref = selector_f.apply(this, [data]);

      // Make sure we have a collection reference
      if (!ref.collection)
        throw new Meteor.Error(404, "Not Found", "No collection found");

      // Make sure we have a file reference
      if (ref.file) {
        return httpDelHandler.apply(this, [data, ref]);
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
    // Add debug message
    FS.debug && console.log(mountPoint);
  });

  // XXX: HTTP:methods should unmount existing mounts in case of overwriting?d
  HTTP.methods(accessPoints);

};


Meteor.startup(function () {
  FS.HTTP.mount([
    baseUrl + '/files/:collectionName/:id/:filename',
    baseUrl + '/files/:collectionName/:id',
    baseUrl + '/files/:collectionName'
  ], function(data) {
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
      file: file
    };
  });

  // FS.debug && console.log("Registered HTTP method URLs:\n\n" + currentHTTPMethodNames.join('\n') + '\n');
});
