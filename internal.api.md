> File: ["accessPoint.js"](accessPoint.js)
> Where: {server|client}

-

#### <a name="APDownload"></a>APDownload(fileObj, storeName, [start], [end])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Returns the data, or partial data, for the fileObj as stored in the
store with name storeName.
Simply returns the result of fileObj.get() after checking "download"
allow/deny functions.
```
-
*This method is private*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
* __storeName__ *{String}*  
* __start__ *{Number}*    (Optional)
* __end__ *{Number}*    (Optional)

-

__Returns__  *{undefined}*




> ```var APDownload = function(fileObj, storeName, start, end) { ...``` [accessPoint.js:58](accessPoint.js#L58)

-

#### <a name="APDelete"></a>APDelete(fileObj)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
```
Deletes fileObj. Always deletes the entire file record and all data from all
defined stores, even if a specific store name is passed. We don't allow
deleting from individual stores.
```
-
*This method is private*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  

-

__Returns__  *{undefined}*


> ```var APDelete = function(fileObj) { ...``` [accessPoint.js:107](accessPoint.js#L107)

-

#### <a name="FS.AccessPoint.DDP.mountPut"></a>FS.AccessPoint.DDP.mountPut([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __mountPut__ is defined in `FS.AccessPoint.DDP`*

__Arguments__

* __options__ *{object}*    (Optional)
Options
    - __name__ *{array}*    (Default = '/cfs/files/put')
Define a custom method name

-

Mounts an upload handler method with the given name

> ```FS.AccessPoint.DDP.mountPut = function(options) { ...``` [accessPoint.js:257](accessPoint.js#L257)

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

> ```FS.AccessPoint.DDP.mountGet = function(options) { ...``` [accessPoint.js:279](accessPoint.js#L279)

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

> Mounts HTTP method at baseUrl/:collectionName/:id/:store?[download=true]

> ```FS.AccessPoint.HTTP.mount = function(options) { ...``` [accessPoint.js:314](accessPoint.js#L314)

-

-
Mount defaults for use by all collections. You may call these
again with custom method names if you don't like the default names.
