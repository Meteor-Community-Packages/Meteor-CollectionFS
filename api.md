
#### <a name="FS.AccessPoint.DDP"></a>*fsAccesspoint*.DDP(cfs, [options])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __DDP__ is defined in `FS.AccessPoint`*

__Arguments__

* __cfs__ *{[FS.Collection](#FS.Collection)}*  
FS.Collection to create DDP access point for
* __options__ *{object}*    (Optional)
Not used on the DDP access point

-

> Mounts two DDP methods on:
> * /cfs/files/collectionName/put
> * /cfs/files/collectionName/get

> ```FS.AccessPoint.DDP = function(cfs, options) { ...``` [accessPoint.js:213](accessPoint.js#L213)

-

#### <a name="FS.AccessPoint.HTTP"></a>*fsAccesspoint*.HTTP(cfs, [options])&nbsp;&nbsp;<sub><i>Server</i></sub> ####
-
*This method __HTTP__ is defined in `FS.AccessPoint`*

__Arguments__

* __cfs__ *{[FS.Collection](#FS.Collection)}*  
FS.Collection to create HTTP access point for
* __options__ *{object}*    (Optional)
Options
    - __httpHeaders__ *{array}*    (Optional)
Allows the user to set extra http headers

-

> Mounts four HTTP methods:
> With download headers set:
> * /cfs/files/collectionName/download/:id
> * /cfs/files/collectionName/download/:id/selector
> Regular HTTP methods
> * /cfs/files/collectionName/:id
> * /cfs/files/collectionName/:id/selector

> ```FS.AccessPoint.HTTP = function(cfs, options) { ...``` [accessPoint.js:235](accessPoint.js#L235)

-
