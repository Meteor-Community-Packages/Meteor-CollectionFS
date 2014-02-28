
#### <a name="FS.AccessPoint.DDP.mountGet"></a>FS.AccessPoint.DDP.mountGet([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __mountGet__ is defined in `FS.AccessPoint.DDP`*

__Arguments__

* __options__ *{object}*    (Optional)
Options
    - __name__ *{array}*    (Default = '/cfs/files/get')
Define a custom method name

-


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


Mounts HTTP method at baseUrl/:collectionName/:id/:store?[download=true]

> ```FS.AccessPoint.HTTP.mount = function(options) { ...``` [accessPoint.js:311](accessPoint.js#L311)

-

-
Mount defaults for use by all collections. You may call these
again with custom method names if you don't like the default names.
