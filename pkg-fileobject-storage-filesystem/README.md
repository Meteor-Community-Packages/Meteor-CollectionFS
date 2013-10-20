fileobject-storage-filesystem
=========================

Adds .putFilesystem() and .delFilesystem() to FileObject.

```js
var returnValueFromPutFilesystem = fo.putFilesystem({
  subfolder: "" //name of subfolder to use under "cfs" folder; generally might want to pass in the name of the corresponding UploadsCollection
});

fo.delFilesystem(returnValueFromPutFilesystem);
```
