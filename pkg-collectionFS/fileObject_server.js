"use strict";
//extend FileObject with CFS-specific methods
if (typeof FileObject !== "undefined") {
  FileObject.prototype.putCFS = function(collectionFS) {
    var id = collectionFS.insert(this);
    if (!id)
      return null;
    //return all info needed to retrieve or delete
    return {
      url: null,
      id: id
    };
  };

  FileObject.prototype.delCFS = function(collectionFS, info) {
    //info is the return value from putCFS
    collectionFS.remove({_id: info.id});
    return true;
  };
}