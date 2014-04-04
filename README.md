cfs-s3
=========================

NOTE: This package is under active development right now (2014-4-4). It has
bugs and the API may continue to change. Please help test it and fix bugs,
but don't use in production yet.

A Meteor package that adds Amazon S3 storage for
[CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS).

## Installation

Install using Meteorite. When in a Meteor app directory, enter:

```
$ mrt add cfs-s3
```

## S3 Setup

1. In AWS S3, create a new bucket for your CFS store. Enter the name of the bucket for the `bucket` option in your S3 store options.
2. Select the bucket, and then select Properties. Note the region, and enter the correct region in your S3 store options in your project. S3 displays the region *name* rather than the actual region, so you need to [check out this table](http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region) and use the corresponding value from the "Region" column for your store `region` value. Alternatively, you can specify the `endpoint` option, using the value from that same table.
3. In AWS IAM, create a new user. Copy the generated key and secret and paste into the S3 store options in your project.
4. Select your newly created user. In the bottom area, select Permissions > Attach User Policy.
5. Select Custom Policy.
6. To create the custom policy, give it any name you want, and then copy and paste the example policy below. Replace "mybucketname" with your actual bucket name.

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::*"
    },
    {
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:DeleteObject",
        "s3:DeleteObjectAcl"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::mybucketname/*"
      ]
    }
  ]
}
```

You may have to wait for an unknown number of minutes for the new security to
take effect.

## Usage

Perform the steps in the "S3 Setup" section, putting the necessary information into your
S3Store options, like so:

```js
var imageStore = new FS.Store.S3("images", {
  region: "my-s3-region", //optional in most cases
  accessKeyId: "account or IAM key", //required if environment variables are not set
  secretAccessKey: "account or IAM secret", //required if environment variables are not set
  bucket: "mybucket", //required
  ACL: myValue //optional, default is 'private', but you can allow public or secure access routed through your app URL
  // The rest are generic store options supported by all storage adapters
  transformWrite: myTransformWriteFunction, //optional
  transformRead: myTransformReadFunction, //optional
  maxTries: 1 //optional, default 5
});

Images = new FS.Collection("images", {
  stores: [imageStore]
});
```

### Tips

* Initially try specifying only the `accessKeyId`, `secretAccessKey`, and `bucket` options. Then, if it doesn't work, try adding the `region` option. The `region` option is not usually necessary, but for some S3 regions and setups, you might need it.
* Once you have things working, you can add any other [global configuration options supported by the `aws-sdk`](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Service-Specific_Configuration). The most common will be `ACL`, for which the allowed values are:
    * "private"
    * "public-read"
    * "public-read-write"
    * "authenticated-read"
    * "bucket-owner-read"
    * "bucket-owner-full-control"

Refer to the [CollectionFS](https://github.com/CollectionFS/Meteor-CollectionFS)
package documentation for more information.

## Notes

* Be sure to define your store in a server file that is not shipped to the
client since it contains credentials. Wrapping in `Meteor.isServer` is not
secure. For best security, you can omit the key and secret options and instead
[set your credentials in environment variables](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Credentials_from_Environment_Variables).

## API

[For Users](https://github.com/CollectionFS/Meteor-cfs-s3/blob/master/api.md)

[For Contributors](https://github.com/CollectionFS/Meteor-cfs-s3/blob/master/internal.api.md)
