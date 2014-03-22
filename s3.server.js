// We use the official aws sdk
AWS = Npm.require('aws-sdk');

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
