"use strict";
if (typeof Handlebars !== 'undefined') {
  //Usage (Is current user the owner?):
  //{{uplIsOwner}} (with FileObject or UploadRecord as current context)
  //Usage (Is user with userId the owner?):
  //{{uplIsOwner userId=userId}} (with FileObject or UploadRecord as current context)
  Handlebars.registerHelper('uplIsOwner', function(opts) {
    var hash, userId;
    hash = opts && opts.hash ? opts.hash : {};
    userId = hash.userId || Meteor.userId();
    return (this.owner === userId);
  });

  //Usage (default format string):
  //{{uplFormattedSize}} (with FileObject or UploadRecord as current context)
  //Usage (any format string supported by numeral.format):
  //{{uplFormattedSize formatString=formatString}} (with FileObject or UploadRecord as current context)
  Handlebars.registerHelper('uplFormattedSize', function(opts) {
    var hash, formatString;
    hash = opts.hash || {};
    formatString = hash.formatString || '0.00 b';
    return numeral(this.length).format(formatString);
  });

  //Usage: {{uplFileProgress}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileProgress', function() {
    var self = this, done = self.uploadedChunks, total = self.totalChunks;
    if (!done || !total)
      return 0;

    return (done / total) * 100;
  });

  //Usage: {{uplFileProgressBar attribute=value}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileProgressBar', function(options) {
    var hash = options.hash;
    hash = hash || {};
    return new Handlebars.SafeString(Template._uplFileProgressBar({
      uploadRecord: this,
      attributes: objToAttributes(hash)
    }));
  });

  //Usage: {{uplFileHandlers}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileHandlerNames', function() {
    var self = this, fileHandlers = [];

    if (!self.fileHandler)
      return fileHandlers;

    _.each(self.fileHandler, function(val, key) {
      if (val)
        fileHandlers.push(key);
    });
    return fileHandlers;
  });

  //Usage: {{uplFileHandlers}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileHandlers', function() {
    var self = this, fileHandlers = [];

    if (!self.fileHandler)
      return fileHandlers;

    _.each(self.fileHandler, function(val, key) {
      if (!val)
        return;
      if (_.isObject(val))
        val.name = key;
      fileHandlers.push(val);
    });
    return fileHandlers;
  });

  //Usage: {{uplFileHandler "fileHandlerName"}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileHandler', function(fileHandler) {
    var self = this;
    return (typeof self.fileHandler === "object") ? self.fileHandler[fileHandler] : {};
  });

  Template._uplFileInput.events({
    'change .uplFileInput': function(event, template) {
      var files = event.target.files, uploadsCollection = template.data.uploadsCollection;

      if (!files)
        throw new Error("uplFileInput Helper: no files");

      if (!uploadsCollection)
        throw new Error("uplFileInput Helper: no bound UploadsCollection");

      uploadsCollection.insert(files, function() {
        event.target.parentElement.reset();
      });
    }
  });

  //Usage: {{uplFileInput uploadsCollection attribute=value}}
  Handlebars.registerHelper('uplFileInput', function(uploadsCollection, options) {
    var hash = options.hash;
    hash = hash || {};
    hash["class"] = hash["class"] ? hash["class"] + ' uplFileInput' : 'uplFileInput';
    return new Handlebars.SafeString(Template._uplFileInput({
      uploadsCollection: uploadsCollection,
      attributes: objToAttributes(hash)
    }));
  });
} else {
  throw new Error("add the handlebars package");
}

var objToAttributes = function(obj) {
  if (!obj) {
    return "";
  }
  var a = "";
  _.each(obj, function(value, key) {
    a += ' ' + key + '="' + value + '"';
  });
  return a;
};