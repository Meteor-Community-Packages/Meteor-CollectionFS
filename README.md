cfs-s3
=========================

Adds Amazon S3 storage adapter to CollectionFS.

1. Create a new bucket in S3. We'll refer to this as `mybucket`.
2. If desired, create an IAM policy specific to allowing this app access to this bucket.
3. Use like so:

```js
var myS3Store = new CollectionFS.S3Store("myS3Store", {
  region: "my-s3-region", //required
  key: "account or IAM key", //required
  secret: "account or IAM secret", //required
  bucket: "mybucket", //required
  'x-amz-acl': myValue //default is 'public-read'
});
```