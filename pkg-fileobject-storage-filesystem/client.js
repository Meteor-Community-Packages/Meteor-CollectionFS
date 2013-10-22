//register storage adaptor
UploadsCollection.registerStorageAdaptor("filesystem", {
  url: function(info) {
    return info ? info.url : "";
  }
});