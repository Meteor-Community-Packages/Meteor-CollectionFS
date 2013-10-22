var path = Npm.require('path');
var Future = Npm.require(path.join('fibers', 'future'));
var Knox = Npm.require('knox');

//extend FileObject with CFS-specific methods
if (typeof FileObject !== "undefined") {
  FileObject.prototype.putS3 = function(options) {
    var self = this;
    options = _.extend({
      region: null, //required
      key: null, //required
      secret: null, //required
      bucket: null, //required
      style: "path",
      'x-amz-acl': 'public-read',
      fileKey: '/' + (new Date).getTime() + '/' + self.filename.replace(" ", "_")
    }, options);

    var S3 = Knox.createClient(options);

    var fut = new Future();
    var headers = {
      'Content-Length': self.length,
      'Content-Type': self.contentType,
      'x-amz-acl': options['x-amz-acl']
    };
    var req = S3.putBuffer(self.buffer, options.fileKey, headers, function(err, res) {
      if (res && req && res.statusCode === 200 && req.url) {
        //return all info needed to retrieve or delete
        fut.return({
          url: req.url,
          path: req.path,
          fileKey: options.fileKey
        });
      } else {
        fut.return(false);
      }
    });
    req.on('error', function (){}); //need this to prevent unhandled errors killing the app
    return fut.wait();
  };

  FileObject.prototype.delS3 = function(options, returnValueFromPut) {
    var self = this;
    options = _.extend({
      endpoint: null, //required
      region: null, //required
      key: null, //required
      secret: null, //required
      bucket: null, //required
      style: "path",
      'x-amz-acl': 'public-read',
      fileKey: '/' + (new Date).getTime() + '/' + self.filename.replace(" ", "_")
    }, options);

    var S3 = Knox.createClient(options);

    var fut = new Future();
    S3.deleteFile(returnValueFromPut.fileKey, function(err, res) {
      if (err)
        throw err;

      fut.return(!!res);
    });
    return fut.wait();
  };
  
  //register storage adaptor
  UploadsCollection.registerStorageAdaptor("s3", {
    put: function (config) {
      return this.putS3(config);
    },
                get: function(config, info) {

    },
    getChunk: function(config, info, chunkNumber) {
    },
    del: function (config, info) {
      return this.delS3(config, info);
    }
  });
}