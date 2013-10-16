1. Create a new bucket in S3. We'll refer to this as `mybucket`.
2. If desired, create an IAM policy specific to allowing this app access to this bucket.
3. Call like so:

```js
fileObject.putS3({
      endpoint: "my.s3.endpoint", //required
      region: "my-s3-region", //required
      key: "account or IAM key", //required
      secret: "account or IAM secret", //required
      bucket: "mybucket", //required
      'x-amz-acl': myValue, //default is 'public-read'
      fileKey: myFileKey //S3 file key (path and name); default is based on fileObject.filename with time-based "folder"
    });
```

This call blocks.