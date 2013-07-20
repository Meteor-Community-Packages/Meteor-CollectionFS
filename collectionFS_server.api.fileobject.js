"use strict";

/*
  SERVER API

  The fileObject is equal to the fileRecord + server-side api
  This pattern will allow easier manipulation of files since we now pass
  file objects with methods attatched.
  In many cases we are only passed content objects with no reference to the
  collection attached - This way we actually know were the data belongs and
  makes operations much easier.

*/
_.extend(_fileObject.prototype, {
  // Expect self to have the properties of fileRecord
  // Added is self.collection for access to the collection the file belongs

  // TODO: Add server file object api
  remove: function() {
    // TODO: Remove this file
  },
  getExtension: function() {
    var extension;
    // TODO: parse extension
    return extension;
  },
  getUrl: function(filehandler) {
    var filehandlerUrl;
    // TODO: return url to filehandler
    return filehandlerUrl;
  }
});