if (typeof Handlebars !== 'undefined') {
  ////Usage:
  //{{cfsDownloadButton}} (with FileObject as current context)
  //Supported Options: content, any attribute
  Handlebars.registerHelper('cfsDownloadButton', function(opts) {
    var hash, content;
    hash = opts.hash || {};
    hash["class"] = hash["class"] ? hash["class"] + ' cfsDownloadButton' : 'cfsDownloadButton';
    content = hash.content || "Download";
    if ("content" in hash)
      delete hash.content;
    return new Handlebars.SafeString(Template._cfsDownloadButton({
      fileObject: this,
      content: content,
      attributes: objToAttributes(hash)
    }));
  });

  Template._cfsDownloadButton.events({
    'click .cfsDownloadButton': function(event, template) {
      var fileObject = template.data.fileObject;
      if (!fileObject) {
        return false;
      }

      if (fileObject.blob) {
        fileObject.saveLocal();
      } else {
        fileObject.loadBlobFromCFS(function() {
          if (fileObject.blob) {
            fileObject.saveLocal();
          }
        });
      }

      return false;
    }
  });

  //Usage:
  //{{cfsFile collectionFS fileId}}
  Handlebars.registerHelper('cfsFile', function(collection, fileId) {
    return collection.findOne(fileId);
  });

  //Usage:
  //{{cfsFiles collectionFS}}
  Handlebars.registerHelper('cfsFiles', function(collection) {
    return collection.find();
  });

  //Usage:
  //{{#if cfsHasFiles collectionFS}}
  Handlebars.registerHelper('cfsHasFiles', function(collection) {
    return collection.find().count() > 0;
  });

  //Usage: {{cfsIsDownloading}} (with FileObject as current context)
  Handlebars.registerHelper('cfsIsDownloading', function() {
    var self = this;
    if (!self._id || !self.collection || !self.collection.downloadManager)
      return false;
    return self.collection.downloadManager.currentFileId() === self._id;
  });

  //Usage: {{cfsCurrentSpeed collectionFS}}
  Handlebars.registerHelper('cfsCurrentSpeed', function(collection) {
    if (!collection || !collection.downloadManager)
      return 0;
    return collection.downloadManager.currentSpeed();
  });

  //Usage: {{cfsFileProgress}} (with FileObject as current context)
  Handlebars.registerHelper('cfsFileProgress', function() {
    var self = this;
    if (!self._id || !self.collection || !self.collection.downloadManager)
      return 0;
    return self.collection.downloadManager.getProgressForFileId(self._id);
  });

  //Usage: {{cfsFileProgressBar attribute=value}} (with FileObject as current context)
  Handlebars.registerHelper('cfsFileProgressBar', function(options) {
    var hash = options.hash;
    hash = hash || {};
    return new Handlebars.SafeString(Template._cfsFileProgressBar({
      fileObject: this,
      attributes: objToAttributes(hash)
    }));
  });

  //Usage: {{cfsBlobUrl}} (with FileObject as current context)
  //Will download blob and store data in session the first time it's rendered
  Handlebars.registerHelper('cfsBlobUrl', function() {
    var self = this;
    
    if (!window || !window.URL || !window.URL.createObjectURL || !self._id)
      return "";
    
    var key = "cfsBlobUrlForId_" + self._id + "_inCollection_" + self.collection._name;

    if (!Session.get(key)) {
      self.loadBlobFromCFS(function () {
        Session.set(key, window.URL.createObjectURL(self.blob));
      });
    }

    return Session.get(key);
  });
  
  //Usage: {{cfsBlobImage}} (with FileObject as current context)
  Handlebars.registerHelper('cfsBlobImage', function(options) {
    var hash = options.hash;
    hash = hash || {};
    return new Handlebars.SafeString(Template._cfsBlobImage({
      fileObject: this,
      attributes: objToAttributes(hash)
    }));
  });

  //Usage:
  //{{cfsIsPaused "Collection"}}
  Handlebars.registerHelper('cfsIsPaused', function(collection) {
    var CFS = window[collection];
    if (!CFS || !CFS.queue) {
      return false;
    }
    return CFS.queue.isPaused();
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