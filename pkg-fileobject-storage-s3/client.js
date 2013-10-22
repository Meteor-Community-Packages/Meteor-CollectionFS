//register storage adaptor
UploadsCollection.registerStorageAdaptor("s3", {
  url: function(info) {
    return info ? info.url : "";
  }
});