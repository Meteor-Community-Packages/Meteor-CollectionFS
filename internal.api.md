> File: ["upload-ddp-client.js"](upload-ddp-client.js)
> Where: {client}

-
XXX: we dont have to use a subqueue - a task can do next(null) to be rerun later
It could be an optimization if needed.
XXX: we should make the queue connection aware - in case of failures and no
connection it should pause the queue - and start again when online again.
XXX: we should have a handle to pause or cancel the file upload
XXX: we should have a handle to the file when uploading
XXX: we should refactor this package into ddp transfer making the tranfer
package the general mechanism for chunk uploading - dispite protocol.

#### <a name="_taskHandler"></a>_taskHandler(task, next)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*

__Arguments__

* __task__ *{Object}*  
* __next__ *{Function}*  

-

__Returns__  *{undefined}*


> ```var _taskHandler = function(task, next) { ...``` [upload-ddp-client.js:22](upload-ddp-client.js#L22)

-

#### <a name="_errorHandler"></a>_errorHandler(data, addTask)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method is private*

__Arguments__

* __data__ *{Object}*  
* __addTask__ *{Function}*  

-

__Returns__  *{undefined}*


> ```var _errorHandler = function(data, addTask) { ...``` [upload-ddp-client.js:59](upload-ddp-client.js#L59)

-

#### <a name="UploadTransferQueue"></a>new UploadTransferQueue([options])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-

__Arguments__

* __options__ *{Object}*    (Optional)
    - __connection__ *{Object}*    (Default = a separate connection to the default Meteor DDP URL)
The connection to use

-

> ```UploadTransferQueue = function(options) { ...``` [upload-ddp-client.js:71](upload-ddp-client.js#L71)

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

> ```self.resumeUploadingFile = function (fileObj) { ...``` [upload-ddp-client.js:107](upload-ddp-client.js#L107)

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
```

> ```self.uploadFile = function(fileObj) { ...``` [upload-ddp-client.js:127](upload-ddp-client.js#L127)

-

#### <a name="FS.DDP.uploadQueue"></a>FS.DDP.uploadQueue UploadTransferQueue&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This property __uploadQueue__ is defined in `FS.DDP`*


There is a single uploads transfer queue per client (not per CFS)

> ```FS.DDP.uploadQueue = new UploadTransferQueue();``` [upload-ddp-client.js:213](upload-ddp-client.js#L213)

-
