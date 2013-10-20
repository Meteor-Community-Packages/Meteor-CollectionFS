CollectionFS
=========================

Exports CollectionFS and extends FileObject, adding .putCFS and .delCFS.

```js
myCFS = new CollectionFS("mycfs");
myCFS.insert(fo); //save fileInfo to .files and split buffer into .chunks collection

//or
var returnValueFromPutCFS = fo.putCFS(myCFS);
fo.delCFS(myCFS, returnValueFromPutCFS);
```