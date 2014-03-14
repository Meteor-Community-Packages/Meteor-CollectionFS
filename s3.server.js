// We use the official aws sdk
var AWS = Npm.require('aws-sdk');

// We ideally want to pass through the stream to s3
var PassThrough = Npm.require('stream').PassThrough;

// ... But this is not allways possible since S3 requires the data length set
var TransformStream = Npm.require('stream').Transform;

// We create a temp file if needed for the indirect streaming
var fs = Npm.require('fs');
var temp = Npm.require('temp');

// We use inherites
var util = Npm.require('util');

var Stream = Npm.require('stream');

// Well now, S3 requires content length but we want a general streaming pattern
// in cfs. The createWriteStream will use this
function IndirectS3Stream(options, callback) {
  var self = this;

  // Use new to fire up this baby
  if (!(this instanceof IndirectS3Stream))
    return new IndirectS3Stream(options);

  // So we use the transform stream patter - even though we only use the write
  // part. We do this to take advantage of the _flush mechanism for repporting
  // back errors and halting the stream until we have actually uploaded the data
  // to the s3 server.
  TransformStream.call(this, options);

  // We require a callback for returning stream, length etc.
  if (typeof callback !== 'function')
    throw new Error('S3 SA IndirectS3Stream needs callback');

  // We calculate the size on the run, this way we dont need to do fs.stats
  // to get file size
  self._cfsDataLength = 0;

  // This doesnt make the big difference - setting it to true makes sure both
  // read/write streams are ended
  self.allowHalfOpen = true;

  // Callback - will be served with
  // 1. readStream
  // 2. length of data
  // 3. callback to repport errors and end the stream
  self.callback = callback;

  // Get a temporary filename
  self.tempName = temp.path({ suffix: '.cfsS3.bin'});

  // Create a temporary file for as buffer - keeping the data out of memory
  self.tempWriteStream = fs.createWriteStream(self.tempName);
};

util.inherits(IndirectS3Stream, TransformStream);

// We rig the transform - it basically dumps the data into the tempfile
// and sums up the data length
IndirectS3Stream.prototype._transform = function(chunk, encoding, done) {
  var self = this;

  // Add to data length
  self._cfsDataLength += chunk.length;

  // Push to the write stream and let this call done
  self.tempWriteStream.write(chunk, encoding, done);
};

IndirectS3Stream.prototype._flush = function(done) {
  var self = this;

  // End write stream
  self.tempWriteStream.end();

  // Create write stream from temp file
  var readStream = fs.createReadStream(self.tempName);

  readStream.on('error', function(err) {
    // Clean up the tempfile
    try {
      fs.unlinkSync(self.tempName);
    } catch(e) {
      // noop we already got an error to repport
    }
    // Emit the passed error
    self.emit('error', err);
  });

  // Return readstream and size of it
  return self.callback(readStream, self._cfsDataLength, function(err) {
    // When done we emit events
    if (err) {
      self.emit('error', err);
    } else {
      self.emit('close');
    }

    // Clean up the tempfile
    try {
      fs.unlinkSync(self.tempName);
    }catch(e) {
      // We dont care too much. XXX: should this be handled?
    }
    // Call done - this is not respected
    done(err);
  });
};

AWS.S3.prototype.createReadStream = function(params, options) {
  // Simple wrapper
  return this.getObject(params).createReadStream();
};

AWS.S3.prototype.createWriteStream = function(params, options) {
  var self = this;
  params = params || {};

  if (params.ContentLength > 0) {
    // This is direct streaming

    // Create a simple pass through stream
    var PassThroughStream = new PassThrough();

    // Set the body to the pass through stream
    params.Body = PassThroughStream;

    console.log('putObject direct streaming size: ' + params.ContentLength);

    self.putObject(params, function(err) {
      if (err) {
        // Emit S3 error to the stream
        PassThroughStream.emit('error', err);
      } else {
        // Emit a close event - this triggers a complete method
        PassThroughStream.emit('close');
      }
    });

    // Return the pass through stream
    return PassThroughStream;

  } else {
    // No content length? bugger - AWS needs a length for security reasons
    // so we need to stop by the filesystem to get the length - we dont
    // want this buffered up in memory...
    //
    var indirectS3Stream = new IndirectS3Stream({}, function(readStream, size, callback) {
      console.log('CALLBACK got size: ', size);

      // Set the body to the readstream
      params.Body = readStream;

      // Set the content length
      params.ContentLength = size;

      // Send the data to the S3
      self.putObject(params, callback);

    });

    indirectS3Stream.on('error', function(err) {
      console.log(err);
    });

    return indirectS3Stream;
  }
};


var validS3ServiceParamKeys = [
  'endpoint',
  'accessKeyId',
  'secretAccessKey',
  'sessionToken',
  'credentials',
  'credentialProvider',
  'region',
  'maxRetries',
  'maxRedirects',
  'sslEnabled',
  'paramValidation',
  'computeChecksums',
  's3ForcePathStyle',
  'httpOptions',
  'apiVersion',
  'apiVersions',
  'logger',
  'signatureVersion'
];
var validS3PutParamKeys = [
  'ACL',
  'Body',
  'Bucket',
  'CacheControl',
  'ContentDisposition',
  'ContentEncoding',
  'ContentLanguage',
  'ContentLength',
  'ContentMD5',
  'ContentType',
  'Expires',
  'GrantFullControl',
  'GrantRead',
  'GrantReadACP',
  'GrantWriteACP',
  'Key',
  'Metadata',
  'ServerSideEncryption',
  'StorageClass',
  'WebsiteRedirectLocation'
];

/**
 * @public
 * @constructor
 * @param {String} name - The store name
 * @param {Object} options
 * @param {String} options.region - Bucket region
 * @param {String} options.bucket - Bucket name
 * @param {String} [options.accessKeyId] - AWS IAM key; required if not set in environment variables
 * @param {String} [options.secretAccessKey] - AWS IAM secret; required if not set in environment variables
 * @param {String} [options.ACL='private'] - ACL for objects when putting
 * @param {String} [options.folder='/'] - Which folder (key prefix) in the bucket to use
 * @param {Function} [options.beforeSave] - Function to run before saving a file from the server. The context of the function will be the `FS.File` instance we're saving. The function may alter its properties.
 * @param {Number} [options.maxTries=5] - Max times to attempt saving a file
 * @returns {FS.StorageAdapter} An instance of FS.StorageAdapter.
 *
 * Creates an S3 store instance on the server. Inherits from FS.StorageAdapter
 * type.
 */
FS.Store.S3 = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.S3))
    throw new Error('FS.Store.S3 missing keyword "new"');

  options = options || {};

  // Determine which folder (key prefix) in the bucket to use
  var folder = options.folder;
  if (typeof folder === "string" && folder.length) {
    if (folder.slice(0, 1) === "/") {
      folder = folder.slice(1);
    }
    if (folder.slice(-1) !== "/") {
      folder += "/";
    }
  } else {
    folder = "";
  }

  var bucket = options.bucket;
  if (!bucket)
    throw new Error('FS.Store.S3 you must specify the "bucket" option');

  var defaultAcl = options.ACL || 'private';

  // Remove serviceParams from SA options
 // options = _.omit(options, validS3ServiceParamKeys);

  var serviceParams = _.extend({
    Bucket: bucket,
    region: null, //required
    accessKeyId: null, //required
    secretAccessKey: null, //required
    ACL: defaultAcl
  }, options);

  // Whitelist serviceParams, else aws-sdk throws an error
  // XXX: I've commented this at the moment... It stopped things from working
  // we have to check up on this
  // serviceParams = _.pick(serviceParams, validS3ServiceParamKeys);

  // Create S3 service
  var S3 = new AWS.S3(serviceParams);

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.s3',
    createReadStream: function(fileObj, options) {
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) {
        return new Error('File not found on this store "' + name + '"');
      }
      var fileKey = folder + fileInfo.key;

      return S3.createReadStream({
        Bucket: bucket,
        Key: fileKey
      });

    },
    // Comment to documentation: Set options.ContentLength otherwise the
    // indirect stream will be used creating extra overhead on the filesystem.
    // An easy way if the data is not transformed is to set the
    // options.ContentLength = fileObj.size ...
    createWriteStream: function(fileObj, options) {
      options = options || {};

      // Create the uniq fileKey
      var fileKey = fileObj.collectionName + '/' + fileObj._id + '-' + fileObj.name;

      // Update the fileObj - we dont save it to the db but sets the fileKey
      fileObj.copies[name].key = fileKey;

      // Set options
      var options = _.extend({
        Bucket: bucket,
        Key: folder + fileKey,
      }, options);

      return S3.createWriteStream(options);
    },

/////// DEPRECATE?
    get: function(fileObj, callback) {
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, null); }
      var fileKey = folder + fileInfo.key;

      S3.getObject({
        Bucket: bucket,
        Key: fileKey
      }, function(error, data) {
        callback(error, data && data.Body);
      });
    },
    put: function(fileObj, opts, callback) {
      opts = opts || {};

      var fileKey = fileObj.collectionName + '/' + fileObj._id + '-' + fileObj.name;
      var buffer = fileObj.getBuffer();

      var params = _.extend({
        ContentLength: buffer.length,
        ContentType: fileObj.type,
        Bucket: bucket,
        Body: buffer,
        ACL: defaultAcl,
        Key: folder + fileKey
      }, opts);

      // Whitelist serviceParams, else aws-sdk throws an error
      params = _.pick(params, validS3PutParamKeys);

      // TODO handle overwrite or fileKey adjustments based on opts.overwrite

      S3.putObject(params, function(error) {
        callback(error, error ? void 0 : fileKey);
      });
    },
///////// EO DEPRECATE?

    del: function(fileObj, callback) {
      var fileInfo = fileObj.getCopyInfo(name);
      if (!fileInfo) { return callback(null, null); }
      var fileKey = folder + fileInfo.key;

      S3.deleteObject({
        Bucket: bucket,
        Key: fileKey
      }, function(error) {
        callback(error, !error);
      });
    },
    watch: function() {
      throw new Error("S3 storage adapter does not support the sync option");
    }
  });
};
