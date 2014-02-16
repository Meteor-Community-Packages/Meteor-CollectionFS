var AWS = Npm.require('aws-sdk');
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

  var serviceParams = _.extend({
    region: null, //required
    accessKeyId: null, //required
    secretAccessKey: null //required
  }, options);

  // Whitelist serviceParams, else aws-sdk throws an error
  serviceParams = _.pick(serviceParams, validS3ServiceParamKeys);

  var S3 = new AWS.S3(serviceParams);

  // Clean options TODO make this a whitelist instead
  _.each(['region', 'accessKeyId', 'secretAccessKey', 'bucket', 'ACL'], function (prop) {
    if (prop in options) {
      delete options[prop];
    }
  });

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.s3',
    get: function(fileKey, callback) {
      S3.getObject({
        Bucket: bucket,
        Key: fileKey
      }, Meteor.bindEnvironment(function(error, data) {
        callback(error, data && data.Body);
      }, function (error) {
        callback(error);
      }));
    },
    put: function(id, fileKey, buffer, opts, callback) {
      opts = opts || {};

      //backwards compat
      opts.ContentType = opts.type;

      //adjust fileKey that will be saved and returned to be unique
      fileKey = folder + id + "/" + fileKey;

      var params = _.extend({
        ContentLength: buffer.length,
        Bucket: bucket,
        Body: buffer,
        ACL: defaultAcl,
        Key: fileKey
      }, opts);

      // Whitelist serviceParams, else aws-sdk throws an error
      params = _.pick(params, validS3PutParamKeys);

      S3.putObject(params, Meteor.bindEnvironment(function(error, data) {
        callback(error, error ? void 0 : fileKey);
      }, function (error) {
        callback(error);
      }));
    },
    del: function(fileKey, callback) {
      S3.deleteObject({
        Bucket: bucket,
        Key: fileKey
      }, Meteor.bindEnvironment(function(error, data) {
        callback(error, error ? void 0 : fileKey);
      }, function (error) {
        callback(error);
      }));
    },
    watch: function() {
      throw new Error("S3 storage adapter does not support the sync option");
    }
  });
};
