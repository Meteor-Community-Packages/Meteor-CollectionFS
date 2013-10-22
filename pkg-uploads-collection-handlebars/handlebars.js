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

  //Usage: {{uplFileCopyNames}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileCopyNames', function() {
    var self = this, copies = [];

    if (!self.copies)
      return copies;

    _.each(self.copies, function(val, key) {
      if (val)
        copies.push(key);
    });
    return copies;
  });

  //Usage: {{uplFileCopies}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileCopies', function() {
    var self = this, copies = [];

    if (!self.copies)
      return copies;

    _.each(self.copies, function(val, key) {
      if (!val)
        return;
      if (_.isObject(val))
        val.name = key;
      copies.push(val);
    });
    return copies;
  });

  //Usage: {{uplFileCopyInfo "copyName"}} (with UploadRecord object as current context)
  Handlebars.registerHelper('uplFileCopyInfo', function(copyName) {
    var self = this;
    return (typeof self.copies === "object") ? self.copies[copyName] : {};
  });
  
  /*
   * TODO
   */

  //Usage: {{uplFileUrl}} (with UploadRecord as current context)
//  Handlebars.registerHelper('uplFileUrl', function(copyName) {
//    return this.urlForCopy(copyName);
//  });

//Usage: {{cfsFileProgress}} (with FileObject as current context)
//  Handlebars.registerHelper('cfsFileProgress', function() {
//    var self = this;
//    if (!self._id || !self.collection || !self.collection.downloadManager)
//      return 0;
//    return self.collection.downloadManager.getProgressForFileId(self._id);
//  });

  //Usage: {{cfsFileProgressBar attribute=value}} (with FileObject as current context)
//  Handlebars.registerHelper('cfsFileProgressBar', function(options) {
//    var hash = options.hash;
//    hash = hash || {};
//    return new Handlebars.SafeString(Template._cfsFileProgressBar({
//      fileObject: this,
//      attributes: objToAttributes(hash)
//    }));
//  });
  
  //Usage: {{cfsBlobImage}} (with FileObject as current context)
//  Handlebars.registerHelper('cfsBlobImage', function(options) {
//    var hash = options.hash;
//    hash = hash || {};
//    return new Handlebars.SafeString(Template._cfsBlobImage({
//      fileObject: this,
//      attributes: objToAttributes(hash)
//    }));
//  });
  
    //Usage: {{cfsIsDownloadingCopy}} (with UploadRecord as current context)
//  Handlebars.registerHelper('cfsIsDownloadingCopy', function(copyName) {
//    return this.isDownloadingCopy(copyName);
//  });
  
  ////Usage:
  //{{cfsDownloadButton "copyName"}} (with UploadRecord as current context)
  //Supported Options: content, any attribute
  Handlebars.registerHelper('cfsDownloadButton', function(copyName, opts) {
    var hash, content;
    hash = opts.hash || {};
    hash["class"] = hash["class"] ? hash["class"] + ' cfsDownloadButton' : 'cfsDownloadButton';
    content = hash.content || "Download";
    if ("content" in hash)
      delete hash.content;
    return new Handlebars.SafeString(Template._cfsDownloadButton({
      uploadRecord: this,
      copyName: copyName,
      content: content,
      attributes: objToAttributes(hash)
    }));
  });

  Template._cfsDownloadButton.events({
    'click .cfsDownloadButton': function(event, template) {
      var uploadRecord = template.data.uploadRecord;
      var copyName = template.data.copyName;
      if (!uploadRecord || !copyName) {
        return false;
      }
      
      // Kick off download, and when it's done, tell the browser
      // to save the file in the downloads folder.
      uploadRecord.downloadCopy(copyName, function (err, fileObject) {
        if (err)
          throw err;
        else
          fileObject && fileObject.saveLocal();
      });

      return false;
    }
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