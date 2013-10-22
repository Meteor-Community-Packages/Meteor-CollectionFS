// Make files basic functions available in CollectionFS
_.extend(UploadsCollection.prototype, {
  find: function() {
    return this._collection.find.apply(this._collection, arguments);
  },
  findOne: function() {
    return this._collection.findOne.apply(this._collection, arguments);
  },
  update: function() {
    return this._collection.update.apply(this._collection, arguments);
  },
  remove: function() {
    return this._collection.remove.apply(this._collection, arguments);
  },
  allow: function() {
    return this._collection.allow.apply(this._collection, arguments);
  },
  deny: function() {
    return this._collection.deny.apply(this._collection, arguments);
  }
});

//TODO make sure this works
UploadsCollection.prototype.filter = function(options) {
  //clean up filter option values
  if (!options.allow || !Match.test(options.allow, Object)) {
    options.allow = {};
  }
  if (!options.deny || !Match.test(options.deny, Object)) {
    options.deny = {};
  }
  if (!options.maxSize || !_.isNumber(options.maxSize)) {
    options.maxSize = false;
  }
  if (!options.allow.extensions || !_.isArray(options.allow.extensions)) {
    options.allow.extensions = [];
  }
  if (!options.allow.contentTypes || !_.isArray(options.allow.contentTypes)) {
    options.allow.contentTypes = [];
  }
  if (!options.deny.extensions || !_.isArray(options.deny.extensions)) {
    options.deny.extensions = [];
  }
  if (!options.deny.contentTypes || !_.isArray(options.deny.contentTypes)) {
    options.deny.contentTypes = [];
  }

  this._filter = options;
};

UploadsCollection.prototype.fileIsAllowed = function(fileRecord) {
  var self = this;
  if (!self._filter) {
    return true;
  }
  if (!fileRecord || !fileRecord.contentType || !fileRecord.filename) {
    throw new Error("invalid fileRecord:", fileRecord);
  }
  var fileSize = fileRecord.size || parseInt(fileRecord.length, 10);
  if (!fileSize || isNaN(fileSize)) {
    throw new Error("invalid fileRecord file size:", fileRecord);
  }
  var filter = self._filter;
  if (filter.maxSize && fileSize > filter.maxSize) {
    self.dispatch('invalid', {maxFileSizeExceeded: true}, fileRecord);
    return false;
  }
  var saveAllFileExtensions = (filter.allow.extensions.length === 0);
  var saveAllContentTypes = (filter.allow.contentTypes.length === 0);
  var ext = getFileExtension(fileRecord.filename);
  var contentType = fileRecord.contentType;
  if (!((saveAllFileExtensions ||
          _.indexOf(filter.allow.extensions, ext) !== -1) &&
          _.indexOf(filter.deny.extensions, ext) === -1)) {
    self.dispatch('invalid', {disallowedExtension: true}, fileRecord);
    return false;
  }
  if (!((saveAllContentTypes ||
          contentTypeInList(filter.allow.contentTypes, contentType)) &&
          !contentTypeInList(filter.deny.contentTypes, contentType))) {
    self.dispatch('invalid', {disallowedContentType: true}, fileRecord);
    return false;
  }
  return true;
};

var contentTypeInList = function(list, contentType) {
  var listType, found = false;
  for (var i = 0, ln = list.length; i < ln; i++) {
    listType = list[i];
    if (listType === contentType) {
      found = true;
      break;
    }
    if (listType === "image/*" && contentType.indexOf("image/") === 0) {
      found = true;
      break;
    }
    if (listType === "audio/*" && contentType.indexOf("audio/") === 0) {
      found = true;
      break;
    }
    if (listType === "video/*" && contentType.indexOf("video/") === 0) {
      found = true;
      break;
    }
  }
  return found;
};