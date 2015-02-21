> File: ["access-point-common.js"](access-point-common.js)
> Where: {server|client}

-

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

* __options__ *{Object}*    (Optional)
    - __store__ *{String}*    (Optional)
Name of the store to get from. If not defined, the first store defined in `options.stores` for the collection on the client is used.
    - __auth__ *{Boolean}*    (Default = null)
Add authentication token to the URL query string? By default, a token for the current logged in user is added on the client. Set this to `false` to omit the token. Set this to a string to provide your own token. Set this to a number to specify an expiration time for the token in seconds.
    - __download__ *{Boolean}*    (Default = false)
Should headers be set to force a download? Typically this means that clicking the link with this URL will download the file to the user's Downloads folder instead of displaying the file in the browser.
    - __brokenIsFine__ *{Boolean}*    (Default = false)
Return the URL even if we know it's currently a broken link because the file hasn't been saved in the requested store yet.
    - __metadata__ *{Boolean}*    (Default = false)
Return the URL for the file metadata access point rather than the file itself.
    - __uploading__ *{String}*    (Default = null)
A URL to return while the file is being uploaded.
    - __storing__ *{String}*    (Default = null)
A URL to return while the file is being stored.
    - __filename__ *{String}*    (Default = null)
Override the filename that should appear at the end of the URL. By default it is the name of the file in the requested store.

-


Returns the HTTP URL for getting the file or its metadata.

> ```FS.File.prototype.url = function(options) { ...``` [access-point-common.js:56](access-point-common.js#L56)

-


---
> File: ["access-point-handlers.js"](access-point-handlers.js)
> Where: {server}

-

#### <a name="httpDelHandler"></a>httpDelHandler()&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*

__Returns__  *{any}*
response


HTTP DEL request handler

> ```httpDelHandler = function httpDelHandler(ref) { ...``` [access-point-handlers.js:10](access-point-handlers.js#L10)

-

#### <a name="self.setStatusCode"></a>self.setStatusCode {any}&nbsp;&nbsp;<sub><i>Server</i></sub> ####
```
From the DELETE spec:
A successful response SHOULD be 200 (OK) if the response includes an
entity describing the status, 202 (Accepted) if the action has not
yet been enacted, or 204 (No Content) if the action has been enacted
but the response does not include an entity.
```
-
*This property __setStatusCode__ is defined in `self`*

> ```self.setStatusCode(200);``` [access-point-handlers.js:24](access-point-handlers.js#L24)

-

#### <a name="httpGetHandler"></a>httpGetHandler()&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*

__Returns__  *{any}*
response


HTTP GET request handler

> ```httpGetHandler = function httpGetHandler(ref) { ...``` [access-point-handlers.js:38](access-point-handlers.js#L38)

-


---
> File: ["access-point-server.js"](access-point-server.js)
> Where: {server}

-

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

#### <a name="defaultSelectorFunction"></a>defaultSelectorFunction()&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method is private*

__Returns__  *{ collection, file }*


This is the default selector function

> ```var defaultSelectorFunction = function() { ...``` [access-point-server.js:71](access-point-server.js#L71)

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


> ```FS.HTTP.mount = function(mountPoints, selector_f) { ...``` [access-point-server.js:108](access-point-server.js#L108)

-

#### <a name="FS.HTTP.unmount"></a>FS.HTTP.unmount([mountPoints])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __unmount__ is defined in `FS.HTTP`*

__Arguments__

* __mountPoints__ *{[string ](#string )|[ array of string](# array of string)}*    (Optional)
Optional, if not specified all mountpoints are unmounted

-



> ```FS.HTTP.unmount = function(mountPoints) { ...``` [access-point-server.js:206](access-point-server.js#L206)

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
