/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 *
 * By Morten N.O. Henriksen, http://gi2.dk
 *
 */
"use strict";

// @export CollectionFS
CollectionFS = function(name, options) {
  var self = this;
  self._name = name || "fs";
  self._options = {autopublish: false};
  _.extend(self._options, options);

  //create collections
  self.files = new Meteor.Collection(self._name + '.files', {
    transform: function(doc) {
      // Map transformation client api
      var fo = new FileObject(doc);
      fo.collection = self;
      return fo;
    }
  });
  self.chunks = new Meteor.Collection(self._name + '.chunks', {
    _preventAutopublish: true
  });

  //TODO both of these should deny inserts from clients

  // Setup autopublish if not flag'ed out
  if (self._options.autopublish) {
    Meteor.publish(self._name + '.files', function() {
      return self.find({});
    }, {is_auto: true});
  } //EO Autopublish

  Meteor.startup(function() {
    //Ensure chunks index on files_id and n
    self.chunks._ensureIndex({files_id: 1, n: 1}, {unique: true});

    //add server method to be called from client code
    var methods = {};
    methods["downloadChunk_" + name] = function(options) {
      check(options, {files_id: String, n: Number});

      this.unblock();

      var chunk = self.chunks.findOne(options);
      return chunk ? chunk.data : null;
    };
    Meteor.methods(methods);
  });

}; //EO collectionFS

CollectionFS.prototype.insert = function(fileObject) {
  var self = this;
  var fileId = self.files.insert(fileObject.filesDocument());

  // Check that we are ok
  if (!fileId)
    throw new Error('could not insert "' + fileObject.filename + '" in ' + self._name + ' collection');

  //Put file in upload queue
  var encoding = fileObject.encoding,
          size = fileObject.chunkSize,
          totalChunks = fileObject.expectedChunks();

  for (var n = 0; n < totalChunks; n++) {
    // Handle each chunk
    var start = n * size, end = start + size;
    var data = fileObject.buffer.toString(encoding, start, end);

    // Save data chunk into database
    var cId = self.chunks.insert({
      "files_id": fileId, // _id of the corresponding files collection entry
      "n": n, // chunks are numbered in order, starting with 0
      "data": data // the chunk's payload as a BSON binary type
    });

    // Check that we are okay
    if (!cId)
      throw new Error('insert cannot create chunk ' + n + ' in file ' + fileObject.filename);
  } // EO chunk iteration

  // Return the newly created file id
  return fileId;
};