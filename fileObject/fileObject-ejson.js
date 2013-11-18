// EJSON custom type
FileObject.prototype.typeName = function() {
  return 'FileObject';
};

// EJSON equals type
FileObject.prototype.equals = function(other) {
  var self = this;
  if (other instanceof FileObject) {
    return (self._id === other._id && self.collectionName === other.collectionName);
  }

  if (typeof File !== 'undefined' && other instanceof File) {
    // TODO:
    // other is a File object with name, size etc.
    // we compare the data from self. file record and other
    // could be nice to have a hash for the files
  }

  return false;
};

// EJSON custom clone
FileObject.prototype.clone = function() {
  return new FileObject(this);
};

// EJSON toJSONValue
FileObject.prototype.toJSONValue = function() {
  return cloneFileRecord(this);
};

// EJSON fromJSONValue
FileObject.fromJSONValue = function(value) {
  // We should be able to load the files record from the collection
  var collection = _collectionsFS[value.collectionName];
  if (Meteor.isClient && collection instanceof CollectionFS && value._id) {
    // TODO For now only works on client?
    // If the server method call "Parse error" issue is resolved, use the client
    // code for both client and server.
    var fileObject = collection.findOne({_id: value._id});

    // We found the file record
    if (fileObject) {
      return fileObject;
    }
  }
  // Could not find the filerecord so we return the best we can
  return new FileObject(value);
};

EJSON.addType('FileObject', FileObject.fromJSONValue);