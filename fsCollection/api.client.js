FS.Collection.prototype.acceptDropsOn = function(templateName, selector, metadata, callback) {
  var self = this, events = {}, metadata = metadata || {};

  callback = callback || defaultCallback;

  // Prevent default drag and drop
  function noopHandler(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }

  // Handle file dropped
  function dropped(evt, temp) {
    noopHandler(evt);
    var files = evt.dataTransfer.files, fsFile;
    // Check if the metadata is a getter / function
    if (typeof metadata === 'function') {
      try {
        metadata = metadata.apply(this, [evt, temp]) || {};
      } catch (err) {
        callback(new Error('acceptDropsOn error in metadata getter, Error: ' + (err.stack || err.message)));
      }
    }

    if (typeof metadata !== "object") {
      callback(new Error("metadata must be an object"));
    }

    for (var i = 0, ln = files.length; i < ln; i++) {
      fsFile = new FS.File(files[i]);
      fsFile.metadata = metadata;
      self.insert(fsFile, callback);
    }
  }

  events['dragenter ' + selector] = noopHandler;
  events['dragexit ' + selector] = noopHandler;
  events['dragover ' + selector] = noopHandler;
  events['dragend ' + selector] = noopHandler;
  events['drop ' + selector] = dropped;

  Template[templateName].events(events);
};