var Knox = Npm.require('knox');

FS.S3Store = function(name, options) {
  options = _.extend({
    region: null, //required
    key: null, //required
    secret: null, //required
    bucket: null, //required
    style: "path",
    'x-amz-acl': 'public-read'
  }, options);
  
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

  var S3 = Knox.createClient(options);

  return new FS.StorageAdapter(name, {}, {
    typeName: 'storage.s3',
    get: function(fileKey, callback) {
      var hasReturned = false; // prevent calling the callback more than once
      var bufs = []; 
      var req = S3.get(fileKey);
      req.on('response', function(res) {
        res.on('data', function(chunk) {
          bufs.push(chunk);
        });
        res.on('end', function() {
          var buffer = Buffer.concat(bufs);
          !hasReturned && callback(null, buffer);
          hasReturned = true;
        });
      });
      req.on('error', function(e) {
        !hasReturned && callback(e);
        hasReturned = true;
      });
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
      var req = S3.putBuffer(buffer, fileKey, headers, function(err, res) {
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
      });
      req.on('error', function(err) {
        !hasReturned && callback(err);
        hasReturned = true;
      });
    },
    del: function(fileKey, callback) {
      S3.deleteFile(fileKey, callback);
    },
    watch: function() {
      throw new Error("S3 storage adapter does not support the sync option");
    }
  });
};