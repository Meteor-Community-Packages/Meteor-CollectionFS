//not exported
__storageAdaptors = {};

CollectionFS.registerStorageAdaptor = function (name, config) {
  __storageAdaptors[name] = config;
};