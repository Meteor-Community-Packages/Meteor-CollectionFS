/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 *
 * By Morten N.O. Henriksen, http://gi2.dk
 *
 */

// Transform api onto file objects
_fileObject = function(doc, collection) {
  var self = this;
  self.collection = collection;
  _.extend(self, doc);
};

// @export CollectionFS
CollectionFS = function(name, options) {
	"use strict";
	var self = this;
	self._name = name;
	self._filter = null;
  // Map transformation client api
	self.files = new Meteor.Collection(self._name+'.files', {
    transform: function(doc) {
      return new _fileObject(doc, self);
    }
  });
	//TODO: Add change listener?
	//self.chunks = new Meteor.Collection(self._name+'.chunks');
	self.queue = new _queueCollectionFS(name);
	self._options = { autopublish: true };
	_.extend(self._options, options);

    //events
	self._events = {
    'ready': function() {},
    'invalid': function() {}, // function(CFSErrorType, fileRecord)
    'progress': function() {}, // function(percentageInteger)
    'start': function() {},
    'stop': function() {},
    'resume': function() {}
  };

	//Auto subscribe
	if (self._options.autopublish){
    Meteor.subscribe(self._name+'.files');
  }

}; //EO collectionFS

_queueCollectionFS = function(name) {
  "use strict";
	var self = this;
	self._name = name;
	self.fileDeps  = new Deps.Dependency();
  // TODO: Deps could be finetuned pr. single files?
	self.connection = Meteor.connect(Meteor.default_connection._stream.rawUrl);
	self.spawns = 1;  //0 = we dont spawn into "threads",
                    // 1..n = we spawn multiple "threads"
	self.paused = false;
};
