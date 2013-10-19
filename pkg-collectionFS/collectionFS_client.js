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
  self.chunks = new Meteor.Collection(self._name+'.chunks', {
    _preventAutopublish: true
  });
  
  self.downloadManager = new _downloadManager(self._name); //download manager is client side only

  //Auto subscribe
  if (self._options.autopublish) {
    Meteor.subscribe(self._name + '.files');
  }
}; //EO collectionFS
