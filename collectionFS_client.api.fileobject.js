"use strict";


/*
  CLIENT API

  The clientFileObject is equal to the fileRecord + client-side api
  This pattern will allow easier manipulation of files since we now pass
  file objects with methods attatched.
  In many cases we are only passed content objects with no reference to the
  collection attached - This way we actually know were the data belongs and
  makes operations much easier.

  Eg.

  Template.test.events({
    'click .file': function(event, temp) {
      this._id...
      this.toDataUrl()
      this.toBlob()
      this.remove()
      this.getExtension()
      this.getUrl()
    }
  });

*/
_.extend(_fileObject.prototype, {
  // Expect self to have the properties of fileRecord
  // Added is self.collection for access to the collection the file belongs

  // TODO: Add client file object api
  toDataUrl: function(callback) {
    if (typeOf callback !== 'function') {
      throw new Error("toDataUrl requires function as callback");
    }

    var data;

    // TODO: Load file into data as 'base64 -> url'

    callback(data);
  },
  toBlob: function(callback) {
    if (typeOf callback !== 'function') {
      throw new Error("toBlob requires function as callback");
    }

    var data;

    // TODO: Load file into data as 'blob'

    callback(data);
  }
});