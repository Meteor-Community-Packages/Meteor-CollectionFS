// #############################################################################
//
// STORAGE ADAPTER
//
// #############################################################################

_storageAdapters = {};

FS.StorageAdapter = function(name, options, api) {
  var self = this;

  // Check the api
  if (typeof api === 'undefined') {
    throw new Error('FS.StorageAdapter please define an api');
  }

  if (typeof api.get !== 'function') {
    throw new Error('FS.StorageAdapter please define an api.get function');
  }

  if (typeof api.put !== 'function') {
    throw new Error('FS.StorageAdapter please define an api.put function');
  }

  if (typeof api.del !== 'function') {
    throw new Error('FS.StorageAdapter please define an api.del function');
  }

  if (api.typeName !== '' + api.typeName) {
    throw new Error('FS.StorageAdapter please define an api.typeName string');
  }

  // store reference for easy lookup by name
  if (typeof _storageAdapters[name] !== 'undefined') {
    throw new Error('Storage name already exists: "' + name + '"');
  } else {
    _storageAdapters[name] = self;
  }
  
  // extend self with options and other info
  _.extend(this, options || {}, {
    name: name
  });

  // XXX: TODO, add upload feature here...
  // we default to ddp upload but really let the SA like S3Cloud overwrite to
  // implement direct client to s3 upload

};