> File: ["accessPoint.js"](accessPoint.js)
> Where: {server|client}

-

#### <a name="APUpload"></a>APUpload(fileObj, data, [start])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
 The file object for which we're uploading data.
* __data__ *{binary}*  
 Binary data
* __start__ *{Number}*    (Optional = 0)
 Start position in file at which to write this data chunk.

-

__Returns__  *{undefined}*


The DDP upload access point.

> ```var APUpload = function APUpload(fileObj, data, start) { ...``` [accessPoint.js:15](accessPoint.js#L15)

-

#### <a name="APDownload"></a>APDownload(fileObj, storeName, [start], [end])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
 The file object for which to download data.
* __storeName__ *{String}*  
 The name of the store from which we want data.
* __start__ *{Number}*    (Optional = 0)
 Start position for the data chunk to be returned.
* __end__ *{Number}*    (Optional = end of file)
 End position for the data chunk to be returned.

-

__Returns__  *{undefined}*


Returns the data, or partial data, for the `fileObj` as stored in the
store with name `storeName`.

Simply returns the result of fileObj.get() after checking "download"
allow/deny functions.

> ```var APDownload = function APDownload(fileObj, storeName, start, end) { ...``` [accessPoint.js:59](accessPoint.js#L59)

-

#### <a name="APDelete"></a>APDelete(fileObj)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
 File to be deleted.

-

__Returns__  *{undefined}*


Deletes fileObj. Always deletes the entire file record and all data from all
defined stores, even if a specific store name is passed. We don't allow
deleting from individual stores.

> ```var APDelete = function APDelete(fileObj) { ...``` [accessPoint.js:96](accessPoint.js#L96)

-

#### <a name="APhandler"></a>APhandler([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*

__Arguments__

* __options__ *{Object}*    (Optional)
    - __headers__ *{Object}*    (Optional)
 Additional HTTP headers to include with the response.

-

__Returns__  *{any}*
response


HTTP request handler

> ```var APhandler = function APhandler(options) { ...``` [accessPoint.js:123](accessPoint.js#L123)

-

#### <a name="FS.AccessPoint.DDP.mountGet"></a>FS.AccessPoint.DDP.mountGet([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __mountGet__ is defined in `FS.AccessPoint.DDP`*

__Arguments__

* __options__ *{object}*    (Optional)
Options
    - __name__ *{array}*    (Default = '/cfs/files/get')
Define a custom method name

-

__TODO__
```
* possibly deprecate DDP downloads in favor of HTTP access point with "download" option
```


Mounts a download handler method with the given name

> ```FS.AccessPoint.DDP.mountGet = function(options) { ...``` [accessPoint.js:269](accessPoint.js#L269)

-

#### <a name="FS.AccessPoint.HTTP.mount"></a>FS.AccessPoint.HTTP.mount([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __mount__ is defined in `FS.AccessPoint.HTTP`*

__Arguments__

* __options__ *{object}*    (Optional)
Options
    - __baseUrl__ *{array}*    (Default = '/cfs/files')
Define a custom base URL. Must begin with a '/' but not end with one.
    - __headers__ *{array}*    (Optional)
Allows the user to set extra http headers

-

__TODO__
```
* support collection-specific header overrides
```


Mounts HTTP method at baseUrl/:collectionName/:id/:store?[download=true]

> ```FS.AccessPoint.HTTP.mount = function(options) { ...``` [accessPoint.js:311](accessPoint.js#L311)

-

-
Mount defaults for use by all collections. You may call these
again with custom method names if you don't like the default names.
