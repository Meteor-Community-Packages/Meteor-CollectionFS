> File: ["s3.server.js"](s3.server.js)
> Where: {server}

-

#### <a name="cleanOptions"></a>cleanOptions(opts)&nbsp;&nbsp;<sub><i>undefined</i></sub> ####
-
*This method is private*

__Arguments__

* __opts__ *{Object}*  
- An options object to be cleaned

-

__Returns__  *{undefined}*


Cleans some properties out of the object. Modifies the referenced object
properties directly.

> ```function cleanOptions(opts) { ...``` [s3.server.js:12](s3.server.js#L12)

-

#### <a name="FS.Store.S3"></a>new *fsStore*.S3(name, options, [options['x-amz-acl']])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __S3__ is defined in `FS.Store`*

__Arguments__

* __name__ *{String}*  
* __options__ *{Object}*  
    - __region__ *{Object}*  
- Bucket region
    - __key__ *{Object}*  
- AWS IAM key
    - __secret__ *{Object}*  
- AWS IAM secret
    - __bucket__ *{Object}*  
- Bucket name
    - __style__ *{Object}*    (Default = "path")
    - __folder__ *{String}*    (Default = '/')
- Which folder (key prefix) in the bucket to use
* __options['x-amz-acl']__ *{Object}*    (Optional = 'public-read')
- ACL for objects when putting

-

__Returns__  *{undefined}*


Creates an S3 store instance on the server. Inherits from FS.StorageAdapter
type.

> ```FS.Store.S3 = function(name, options) { ...``` [s3.server.js:37](s3.server.js#L37)

-


---
> File: ["s3.client.js"](s3.client.js)
> Where: {client}

-

#### <a name="FS.Store.S3"></a>new *fsStore*.S3(name, options)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __S3__ is defined in `FS.Store`*

__Arguments__

* __name__ *{[type](#type)}*  
* __options__ *{[type](#type)}*  

-

__Returns__  *{undefined}*


Creates an S3 store instance on the client, which is just a shell object
storing some info.

> ```FS.Store.S3 = function(name, options) { ...``` [s3.client.js:11](s3.client.js#L11)

-
