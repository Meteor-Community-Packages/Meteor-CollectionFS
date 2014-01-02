// EJSON custom type
FS.File.prototype.typeName = function() {
  return 'FS.File';
};

// EJSON equals type
FS.File.prototype.equals = function(other) {
  var self = this;
  if (other instanceof FS.File) {
    return (self._id === other._id && self.collectionName === other.collectionName);
  }
  return false;
};

// EJSON custom clone
FS.File.prototype.clone = function() {
  return new FS.File(this);
};

// EJSON toJSONValue
FS.File.prototype.toJSONValue = function() {
  return cloneFileRecord(this);
};

// EJSON fromJSONValue
FS.File.fromJSONValue = function(value) {
  // We should be able to load the files record from the collection
  var collection = _collections[value.collectionName];
  if (Meteor.isClient && collection instanceof FS.Collection && value._id) {
    var fsFile = collection.findOne({_id: value._id});

    // We found the file record
    if (fsFile) {
      return fsFile;
    }
  }
  // Could not find the filerecord so we return the best we can
  return new FS.File(value);
};

EJSON.addType('FS.File', FS.File.fromJSONValue);