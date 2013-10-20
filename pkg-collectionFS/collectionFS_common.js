"use strict";

// Make files basic functions available in CollectionFS
_.extend(CollectionFS.prototype, {
  find: function() {
    return this.files.find.apply(this.files, arguments);
  },
  findOne: function() {
    return this.files.findOne.apply(this.files, arguments);
  },
  update: function() {
    return this.files.update.apply(this.files, arguments);
  },
  remove: function() {
    return this.files.remove.apply(this.files, arguments);
  },
  allow: function() {
    return this.files.allow.apply(this.files, arguments);
  },
  deny: function() {
    return this.files.deny.apply(this.files, arguments);
  }
});
