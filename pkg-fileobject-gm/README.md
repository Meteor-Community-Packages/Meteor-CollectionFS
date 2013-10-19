fileobject-gm
=========================

Adds .gm() to FileObject and adds .save() to .gm().

```js
var fo = new FileObject(fileRecord); //or FileObject.fromFile(file);
fo.gm().anyGMFunction().save();
```

Calling FileObject.gm() gets you a graphicsmagick context and then calling .save() at the end of your chain saves all of the changes back into the FileObject buffer.

The main purpose of this is to quickly and easily manipulate images within a filehandler "put" function before saving them.