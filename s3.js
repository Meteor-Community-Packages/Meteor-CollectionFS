var Knox = Npm.require('knox');

CollectionFS.S3Store = function(name, options) {
  options = _.extend({
    region: null, //required
    key: null, //required
    secret: null, //required
    bucket: null, //required
    style: "path",
    'x-amz-acl': 'public-read'
  }, options);

  var S3 = Knox.createClient(options);

  return new StorageAdapter(name, {}, {
    typeName: 'storage.s3',
    get: function(fileKey, callback) {
      var req = S3.get(fileKey);
      req.on('response', function(res) {
        res.on('data', function(chunk) {
          callback(null, chunk);
        });
      });
      req.on('error', function(e) {
        callback(e);
      });
      req.end();
    },
    put: function(id, fileKey, buffer, opts, callback) {
      opts = opts || {};
      var headers = {
        'Content-Length': buffer.length,
        'Content-Type': opts.type,
        'x-amz-acl': options['x-amz-acl']
      };
      var req = S3.putBuffer(buffer, fileKey, headers, function(err, res) {
        if (res && req && res.statusCode === 200 && req.url) {
          callback(null, fileKey);
        } else {
          callback(new Error("S3 putBuffer failed"));
        }
      });
      req.on('error', function(e) {
        callback(e);
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