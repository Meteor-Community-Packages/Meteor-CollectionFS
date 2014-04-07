> File: ["http-call-client.js"](http-call-client.js)
> Where: {client}

-

#### <a name="httpCall"></a>httpCall {any}&nbsp;&nbsp;<sub><i>Client</i></sub> ####
```
We use this instead of HTTP.call from the http package for now. If/when
PR 1670 is merged and released, we can probably remove this file and begin
using HTTP.call directly.
```
-

> ```httpCall = function(method, url, options, callback) { ...``` [http-call-client.js:7](http-call-client.js#L7)

-


---
> File: ["upload-http-client.js"](upload-http-client.js)
> Where: {client}

-
2MB default upload chunk size
Can be overridden by user with FS.config.uploadChunkSize or per FS.Collection in collection options

#### <a name="_taskHandler"></a>_taskHandler(task, next)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*

__Arguments__

* __task__ *{Object}*  
* __next__ *{Function}*  

-

__Returns__  *{undefined}*


> ```var _taskHandler = function(task, next) { ...``` [upload-http-client.js:15](upload-http-client.js#L15)

-

#### <a name="_errorHandler"></a>_errorHandler(data, addTask)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*

__Arguments__

* __data__ *{Object}*  
* __addTask__ *{Function}*  

-

__Returns__  *{undefined}*


> ```var _errorHandler = function(data, addTask) { ...``` [upload-http-client.js:49](upload-http-client.js#L49)

-

#### <a name="UploadTransferQueue"></a>new UploadTransferQueue([options])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-

__Arguments__

* __options__ *{Object}*    (Optional)

-

> ```UploadTransferQueue = function(options) { ...``` [upload-http-client.js:58](upload-http-client.js#L58)

-

#### <a name="UploadTransferQueue.isUploadingFile"></a>UploadTransferQueue.isUploadingFile(fileObj)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __isUploadingFile__ is defined in `UploadTransferQueue`*

__Arguments__

* __fileObj__ *{[FS.File](#FS.File)}*  
File to check if uploading

-

__Returns__  *{Boolean}*
True if the file is uploading

__TODO__
```
* Maybe have a similar function for accessing the file upload queue?
```



> ```self.isUploadingFile = function(fileObj) { ...``` [upload-http-client.js:88](upload-http-client.js#L88)

-

#### <a name="UploadTransferQueue.resumeUploadingFile"></a>UploadTransferQueue.resumeUploadingFile(File)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __resumeUploadingFile__ is defined in `UploadTransferQueue`*

__Arguments__

* __File__ *{[FS.File](#FS.File)}*  
to resume uploading

-

__TODO__
```
* Not sure if this is the best way to handle resumes
```

> ```self.resumeUploadingFile = function(fileObj) { ...``` [upload-http-client.js:97](upload-http-client.js#L97)

-

#### <a name="UploadTransferQueue.uploadFile"></a>UploadTransferQueue.uploadFile(File)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __uploadFile__ is defined in `UploadTransferQueue`*

__Arguments__

* __File__ *{[FS.File](#FS.File)}*  
to upload

-

__TODO__
```
* Check that a file can only be added once - maybe a visual helper on the FS.File?
* Have an initial request to the server getting uploaded chunks for resume
```

> ```self.uploadFile = function(fileObj) { ...``` [upload-http-client.js:118](upload-http-client.js#L118)

-

#### <a name="FS.HTTP.uploadQueue"></a>FS.HTTP.uploadQueue UploadTransferQueue&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This property __uploadQueue__ is defined in `FS.HTTP`*


There is a single uploads transfer queue per client (not per CFS)

> ```FS.HTTP.uploadQueue = new UploadTransferQueue();``` [upload-http-client.js:233](upload-http-client.js#L233)

-

#### <a name="FS.File.prototype.resume"></a>*fsFile*.resume(ref)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __resume__ is defined in `prototype` of `FS.File`*

__Arguments__

* __ref__ *{[File](#File)|[Blob](#Blob)|Buffer}*  

-

__TODO__
```
* WIP, Not yet implemented for server
```


> This function is not yet implemented for server

> ```FS.File.prototype.resume = function(ref) { ...``` [upload-http-client.js:247](upload-http-client.js#L247)

-
