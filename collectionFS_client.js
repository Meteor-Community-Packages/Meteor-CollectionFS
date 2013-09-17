/* CollectionFS.js
 * A gridFS kind implementation.
 * 2013-01-03
 * 
 * By Morten N.O. Henriksen, http://gi2.dk
 * 
 */

CollectionFS = function(name, options) {
	var self = this;
	self._name = name;
        self._filter = null;
	self.files = new Meteor.Collection(self._name+'.files'); //TODO: Add change listener?
	//self.chunks = new Meteor.Collection(self._name+'.chunks');
	self.queue = new _queueCollectionFS(name);
	self._options = { autopublish: true };
	_.extend(self._options, options);
        
  //events
  self._events = {
    'ready': function() {},
    'invalid': function() {}, //arg1 = CFSErrorType enum, arg2 = fileRecord
    'progress': function() {}, //arg1 = progress percentage as integer
    'start': function() {},
    'stop': function() {},
    'resume': function() {}
  };

	//Auto subscribe
	if (self._options.autopublish)
		Meteor.subscribe(self._name+'.files');

}; //EO collectionFS

_queueCollectionFS = function(name) {
	var self = this;
	self._name = name;
	self.fileDeps  = new Deps.Dependency; // TODO: These deps could be finetuned pr. single files?
	self.connection = Meteor.connect(Meteor.default_connection._stream.rawUrl);
	self.spawns = 1;				//0 = we dont spawn into "threads", 1..n = we spawn multiple "threads"
	self.paused = false;
};
