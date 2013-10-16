// @export FileObject
FileObject = function(fileRecord, chunksCollection) {
  var self = this;
  
  /*
   * copy info from file record
   */

  //spec info
  if (fileRecord._id)
    self._id = fileRecord._id;

  self.length = fileRecord.length || 0;
  self.chunkSize = fileRecord.chunkSize || 256 * 1024; // Default 256kb ~ 262.144 bytes

  if (fileRecord.uploadDate)
    self.uploadDate = fileRecord.uploadDate;

  if (fileRecord.md5)
    self.md5 = fileRecord.md5; // An MD5 hash returned from the filemd5 API. This value has the String type. (TODO)

  if (fileRecord.filename)
    self.filename = fileRecord.filename; // Original filename

  if (fileRecord.contentType)
    self.contentType = fileRecord.contentType;

  if (fileRecord.aliases)
    self.aliases = fileRecord.aliases;

  if (fileRecord.metadata)
    self.metadata = fileRecord.metadata;

  //non-spec info
  self.owner = fileRecord.owner;
  if (!self.owner && typeof Meteor.userId === "function") {
    self.owner = Meteor.userId();
  }

  self.encoding = fileRecord.encoding || 'utf-8'; // Default 'utf-8'

  if (fileRecord.file)
    self.file = fileRecord.file;

  //optionally pin to a chunks collection from which a buffer can be loaded
  if (chunksCollection)
    self.chunksCollection = chunksCollection;
};

FileObject.prototype.filesDocument = function() {
  var self = this;
  //return just the doc that needs to be saved in the <name>.files collection
  var doc = {};

  /*
   * spec-defined properties: http://docs.mongodb.org/manual/reference/gridfs/#the-files-collection
   */

  //The ID
  if (self._id)
    doc._id = self._id;

  //The size of the document in bytes.
  if (self.length)
    doc.length = self.length;

  //The size of each chunk. GridFS divides the document into chunks of the size specified here. The default size is 256 kilobytes.
  if (self.chunkSize)
    doc.chunkSize = self.chunkSize;

  //The date the document was first stored by GridFS. This value has the Date type.
  if (self.uploadDate)
    doc.uploadDate = self.uploadDate;

  //An MD5 hash returned from the filemd5 API. This value has the String type.  
  if (self.md5)
    doc.md5 = self.md5;

  //Optional. A human-readable name for the document.
  if (self.filename)
    doc.filename = self.filename;

  //Optional. A valid MIME type for the document.
  if (self.contentType)
    doc.contentType = self.contentType;

  //Optional. An array of alias strings.
  if (self.aliases)
    doc.aliases = self.aliases;

  //Optional. Any additional information you want to store.
  if (self.metadata)
    doc.metadata = self.metadata;

  /*
   * extra properties for our implementation
   */

  //file info
  if (self.owner)
    doc.owner = self.owner;

  if (self.encoding)
    doc.encoding = self.encoding;

  return doc;
};

FileObject.prototype.clearId = function() {
  this._id = void 0;
};

FileObject.prototype.setId = function(value) {
  this._id = value;
};

FileObject.prototype.expectedChunks = function() {
  var self = this;
  return Math.ceil(+self.length / self.chunkSize);
};

FileObject.prototype.getExtension = function() {
  var name = this.filename;
  var found = name.lastIndexOf('.') + 1;
  return (found > 0 ? name.substr(found) : "");
};

/*
 * BEGIN Methods needed for custom EJSON type
 */

FileObject.fromJSONValue = function(value) {
  if (value.uploadDate) {
    value.uploadDate = EJSON.fromJSONValue(value.uploadDate);
  }
  return new FileObject(value);
};

FileObject.prototype.typeName = function() {
  return "FileObject";
};

FileObject.prototype.equals = function(other) {
  return other._id === this._id;
};

FileObject.prototype.clone = function() {
  return new FileObject({
    _id: this._id,
    length: this.length,
    chunkSize: this.chunkSize,
    uploadDate: this.uploadDate,
    md5: this.md5,
    filename: this.filename,
    contentType: this.contentType,
    aliases: this.aliases,
    metadata: this.metadata,
    owner: this.owner,
    encoding: this.encoding,
    _addedChunks: this._addedChunks
  });
};

FileObject.prototype.toJSONValue = function() {
  return {
    _id: this._id,
    length: this.length,
    chunkSize: this.chunkSize,
    uploadDate: EJSON.toJSONValue(this.uploadDate),
    md5: this.md5,
    filename: this.filename,
    contentType: this.contentType,
    aliases: this.aliases,
    metadata: this.metadata,
    owner: this.owner,
    encoding: this.encoding,
    _addedChunks: this._addedChunks
  };
};

EJSON.addType("FileObject", FileObject.fromJSONValue);

/*
 * END Methods needed for custom EJSON type
 */