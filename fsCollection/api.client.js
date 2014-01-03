/** @method _eventCallback Internal function for producing a scoped callback
  * @private
  * @param {string} templateName Name of template to apply events on
  * @param {string} selector The element selector eg. "#uploadField"
  * @param {object} dataContext The event datacontext
  * @param {object} evt The event object { error, file }
  * @param {object} temp The template instance
  * @param {FS.File} fsFile File that triggered the event
  */
var _eventCallback = function(templateName, selector, dataContext, evt, temp, fsFile) {
  return function(err, id) {
    if (err) {
      // Fire uploadError event
      _.each(Template[templateName]._events, function(eventObject) {
        if (eventObject.events == 'uploadFailed' && eventObject.selector === selector) {
          eventObject.handler.apply(dataContext, [{ error: err, file: fsFile }, temp]);
        }
      });      
    } else {
      // Fire uploaded
      _.each(Template[templateName]._events, function(eventObject) {
        if (eventObject.events == 'uploaded' && eventObject.selector === selector) {
          eventObject.handler.apply(dataContext, [{ error: null, file: fsFile }, temp]);
        }
      });
    }
  };
};

/** @method _eachFile Internal function for preparing and iterating over files
  * @private
  * @param {array} files List of files to iterate over
  * @param {object} metadata Data to attach to the files
  * @param {function} callback Function to pass the prepared `FS.File` object
  */
var _eachFile = function(files, metadata, callback) {
  // Check if the metadata is a getter / function
  if (typeof metadata === 'function') {
    try {
      metadata = metadata.apply(this, [evt, temp]) || {};
    } catch (err) {
      new Error('Upload files: error in metadata getter, Error: ' + (err.stack || err.message));
    }
  }

  if (typeof metadata !== "object") {
    new Error("metadata must be an object");
  }

  for (var i = 0, ln = files.length; i < ln; i++) {
    var fsFile = new FS.File(files[i]);
    fsFile.metadata = metadata;
    callback(fsFile);
  }
};

/** @method FS.Collection.acceptDropsOn Accept file uploads from element in template
  * @param {string} templateName Name of template to apply events on
  * @param {string} selector The element selector eg. "#uploadField"
  * @param {object|function} [metadata] Data/getter to attach to the file objects
  *
  * Using this method adds an `uploaded` and `uploadFailed` event to the
  * template events. The event object contains `{ error, file }`
  *
  * Example:
```css
.dropzone {
  border: 2px dashed silver; 
  height: 5em;
  padding-top: 3em;

  -webkit-border-radius: 8px;
  -moz-border-radius: 8px;
  -ms-border-radius: 8px;
  -o-border-radius: 8px;
  border-radius: 8px;
}
```

```html
<template name="hello">
  Choose file to upload:<br/>
  <div id="dropzone" class="dropzone">
    <div style="text-align: center; color: gray;">Drop file to upload</div>
  </div>
</template>
```

```js
  Template.hello.events({
    'uploaded #dropzone': function(event, temp) {
      console.log('Event Uploaded: ' + event.file._id);
    }
  });

  images.acceptDropsOn('hello', '#dropzone');
```
  */
FS.Collection.prototype.acceptDropsOn = function(templateName, selector, metadata) {
  var self = this, events = {}, metadata = metadata || {};

  // Prevent default drag and drop
  function noopHandler(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }

  // Handle file dropped
  function dropped(evt, temp) {
    noopHandler(evt);
    var dataContext = this;
    var files = evt.originalEvent.dataTransfer.files;

    _eachFile(files, metadata, function(fsFile) {
      self.insert(fsFile, _eventCallback(templateName, selector, dataContext, evt, temp, fsFile));
    });
  }

  events['dragenter ' + selector] = noopHandler;
  events['dragexit ' + selector] = noopHandler;
  events['dragover ' + selector] = noopHandler;
  events['dragend ' + selector] = noopHandler;
  events['drop ' + selector] = dropped;

  Template[templateName].events(events);
};

/** @method FS.Collection.acceptUploadFrom Accept file uploads from element in template
  * @param {string} templateName Name of template to apply events on
  * @param {string} selector The element selector eg. "#uploadField"
  * @param {object|function} [metadata] Data/getter to attach to the file objects
  *
  * Using this method adds an `uploaded` and `uploadFailed` event to the
  * template events. The event object contains `{ error, file }`
  *
  * Example:
```html
<template name="hello">
  Choose file to upload:<br/>
  <input type="file" id="files" multiple/>
</template>
```

```js
  Template.hello.events({
    'uploaded #files': function(event, temp) {
      console.log('Event Uploaded: ' + event.file._id);
    }
  });

  images.acceptUploadFrom('hello', '#files');
```
  */
FS.Collection.prototype.acceptUploadFrom = function(templateName, selector, metadata) {
  var self = this, events = {}, metadata = metadata || {};

  // Handle file startUpload
  function startUpload(evt, temp) {
    var dataContext = this;
    var files = evt.target.files;

    _eachFile(files, metadata, function(fsFile) {
      self.insert(fsFile, _eventCallback(templateName, selector, dataContext, evt, temp, fsFile));
    });
  }

  events['change ' + selector] = startUpload;

  Template[templateName].events(events); 
};