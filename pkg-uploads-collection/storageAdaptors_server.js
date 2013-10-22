//not exported
__storageAdaptors = {};

UploadsCollection.registerStorageAdaptor = function (name, config) {
  __storageAdaptors[name] = config;
};