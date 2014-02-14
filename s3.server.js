var Knox = Npm.require('knox');

/**
 * @private
 * @method cleanOptions
 * @param {Object} opts - An options object to be cleaned
 * @returns {undefined}
 * 
 * Cleans some properties out of the object. Modifies the referenced object
 * properties directly.
 */
function cleanOptions(opts) {
  _.each(['region', 'key', 'secret', 'bucket', 'style', 'x-amz-acl'], function (prop) {
    if (prop in opts) {
      delete opts[prop];
    }
  });
}

/**
 * @namespace FS
 * @constructor
 * @param {String} name
 * @param {Object} options
 * @param {Object} options.region - Bucket region
 * @param {Object} options.key - AWS IAM key
 * @param {Object} options.secret - AWS IAM secret
 * @param {Object} options.bucket - Bucket name
 * @param {Object} [options.style="path"]
 * @param {Object} [options['x-amz-acl']='public-read'] - ACL for objects when putting
 * @param {String} [options.folder='/'] - Which folder (key prefix) in the bucket to use
 * @returns {undefined}
 * 
 * Creates an S3 store instance on the server. Inherits from FS.StorageAdapter
 * type.
 */
FS.Store.S3 = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.S3))
    throw new Error('FS.Store.S3 missing keyword "new"');
  
  // Determine which folder (key prefix) in the bucket to use
  var folder = options.folder;
  if (typeof folder === "string" && folder.length) {
    if (folder.slice(0, 1) !== "/") {
      folder = "/" + folder;
    }
    if (folder.slice(-1) !== "/") {
      folder += "/";
    }
  } else {
    folder = "/";
  }

  var S3 = Knox.createClient(_.extend({
    region: null, //required
    key: null, //required
    secret: null, //required
    bucket: null, //required
    style: "path",
    'x-amz-acl': 'public-read'
  }, options));
  
  cleanOptions(options);

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.s3',
    get: function(fileKey, callback) {
      var hasReturned = false; // prevent calling the callback more than once
      var bufs = []; 
      var req = S3.get(fileKey);
      req.on('response', Meteor.bindEnvironment(function(res) {
        res.on('data', function(chunk) {
          bufs.push(chunk);
        });
        res.on('end', function() {
          var buffer = Buffer.concat(bufs);
          !hasReturned && callback(null, buffer);
          hasReturned = true;
        });
      }));
      req.on('error', Meteor.bindEnvironment(function(e) {
        !hasReturned && callback(e);
        hasReturned = true;
      }));
      req.end();
    },
    put: function(id, fileKey, buffer, opts, callback) {
      opts = opts || {};
      var hasReturned = false; // prevent calling the callback more than once
      var headers = {
        'Content-Length': buffer.length,
        'Content-Type': opts.type,
        'x-amz-acl': options['x-amz-acl']
      };
      fileKey = folder + id + "/" + fileKey;
      var req = S3.putBuffer(buffer, fileKey, headers, Meteor.bindEnvironment(function(err, res) {
        if (res && res.statusCode === 200 && req && req.url) {
          !hasReturned && callback(null, fileKey);
        } else if (res && res.statusCode) {
          !hasReturned && callback(new Error("S3 Storage Error: S3 returned status code " + res.statusCode));
        } else if (err) {
          !hasReturned && callback(err);
        } else {
          !hasReturned && callback(new Error("Unknown S3 Storage Error"));
        }
        hasReturned = true;
      }));
      req.on('error', Meteor.bindEnvironment(function(err) {
        !hasReturned && callback(err);
        hasReturned = true;
      }));
    },
    del: function(fileKey, callback) {
      S3.deleteFile(fileKey, Meteor.bindEnvironment(callback));
    },
    watch: function() {
      throw new Error("S3 storage adapter does not support the sync option");
    }
  });
};