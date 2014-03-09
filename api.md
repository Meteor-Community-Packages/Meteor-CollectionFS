
#### <a name="FS.HTTP.setBaseUrl"></a>FS.HTTP.setBaseUrl(newBaseUrl)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __setBaseUrl__ is defined in `FS.HTTP`*

__Arguments__

* __newBaseUrl__ *{String}*  
 Change the base URL for the HTTP GET and DELETE endpoints.

-

__Returns__  *{undefined}*


> ```FS.HTTP.setBaseUrl = function setBaseUrl(newBaseUrl) { ...``` [access-point-common.js:13](access-point-common.js#L13)

-

#### <a name="FS.File.prototype.url"></a>*fsFile*.url([options])&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __url__ is defined in `prototype` of `FS.File`*

__Arguments__

* __options__ *{object}*    (Optional)
    - __store__ *{string}*    (Optional)
Name of the store to get from. If not defined,
    - __auth__ *{boolean}*    (Default = null)
Wether or not the authenticate
    - __download__ *{boolean}*    (Default = false)
Should headers be set to force a download
    - __brokenIsFine__ *{boolean}*    (Default = false)
Return the URL even if

-

the first store defined in `options.stores` for the collection is used.
we know it's currently a broken link because the file hasn't been saved in
the requested store yet.

Return the http url for getting the file - on server set auth if wanting to
use authentication on client set auth to true or token

> ```FS.File.prototype.url = function(options) { ...``` [access-point-common.js:52](access-point-common.js#L52)

-


---

#### <a name="FS.HTTP.publish"></a>FS.HTTP.publish(collection, func)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __publish__ is defined in `FS.HTTP`*

__Arguments__

* __collection__ *{[FS.Collection](#FS.Collection)}*  
* __func__ *{Function}*  
 Publish function that returns a cursor.

-

__Returns__  *{undefined}*


Publishes all documents returned by the cursor at a GET URL
with the format baseUrl/record/collectionName. The publish
function `this` is similar to normal `Meteor.publish`.

> ```FS.HTTP.publish = function fsHttpPublish(collection, func) { ...``` [access-point-server.js:32](access-point-server.js#L32)

-

#### <a name="FS.HTTP.unpublish"></a>FS.HTTP.unpublish(collection)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __unpublish__ is defined in `FS.HTTP`*

__Arguments__

* __collection__ *{[FS.Collection](#FS.Collection)}*  

-

__Returns__  *{undefined}*


Unpublishes a restpoint created by a call to `FS.HTTP.publish`

> ```FS.HTTP.unpublish = function fsHttpUnpublish(collection) { ...``` [access-point-server.js:57](access-point-server.js#L57)

-

#### <a name="FS.HTTP.mount"></a>FS.HTTP.mount(mountPoints, selector_f)&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __mount__ is defined in `FS.HTTP`*

__Arguments__

* __mountPoints__ *{[array of string](#array of string)}*  
mount points to map rest functinality on
* __selector_f__ *{function}*  
[selector] function returns `{ collection, file }` for mount points to work with

-


> ```FS.HTTP.mount = function(mountPoints, selector_f) { ...``` [access-point-server.js:107](access-point-server.js#L107)

-

#### <a name="FS.HTTP.unmount"></a>FS.HTTP.unmount([mountPoints])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __unmount__ is defined in `FS.HTTP`*

__Arguments__

* __mountPoints__ *{[string ](#string )|[ array of string](# array of string)}*    (Optional)
Optional, if not specified all mountpoints are unmounted

-



> ```FS.HTTP.unmount = function(mountPoints) { ...``` [access-point-server.js:203](access-point-server.js#L203)

-

-
### FS.Collection maps on HTTP pr. default on the following restpoints:
*
baseUrl + '/files/:collectionName/:id/:filename',
baseUrl + '/files/:collectionName/:id',
baseUrl + '/files/:collectionName'

Change/ replace the existing mount point by:
```js
unmount all existing
FS.HTTP.unmount();
Create new mount point
FS.HTTP.mount([
'/cfs/files/:collectionName/:id/:filename',
'/cfs/files/:collectionName/:id',
'/cfs/files/:collectionName'
]);
```


---

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

> ```FS.AccessPoint.DDP.mountGet = function(options) { ...``` [accessPoint.js:51](accessPoint.js#L51)

-

-
Mount defaults for use by all collections. You may call these
again with custom method names if you don't like the default names.
