#CollectionFS
Is a simple way of handling files on the web in the Meteor environment.

Have a look at [Live example](http://collectionfs.meteor.com/).

It's work in progress, I'll take pull requests, feature requests and feedback for optimizing stability and speed.

CollectionFS is a mix of both [Meteor.Collection](http://docs.meteor.com/#meteor_collection) and MongoDB's [GridFS](http://docs.mongodb.org/manual/core/gridfs/).

Using Meteor and GridFS principles we get:

* Security
* Sharing
* Restrictions (e.g. only allow certain content types, fields, users, etc.)
* Reactive data — CollectionFS's methods should all be reactive
* Ability to resume uploads after connection loss, browser crash or cola in keyboard
* At the moment, files are loaded into the client as a Blob — a universal way of handling large binary data
* Create multiple cached versions, sizes or formats of your files, with an url to the file — or upload files to another service / server

Design overview:
```js
        App               <-| Can retrieve files via DDP and HTTP
-------->|
|      __|________        <-| Adds a connection for each CollectionFS
|      |     | | |
*******************       <-| Internet 
|      |     | | |
|      |     | | |--- 1.  <-| DDP Connections dedicated CollectionFS
|   Meteor   | |----- 2.  <-| for up/downloading chunks / binary data
|   (DDP)    #              | Using EJSON for transport wrapper of
|      |     |------- n.  <-| $binary data
|      |     #####
|      |       |
|      Mongodb-|<- Server <-| Server can add files pr. auto
|      (gridFS)             | or on request from client
|          |
|          |_______##     <-| Filehandlers running autonom scanning
|                   |       | new files to handle, new filehandlers,
|                   |       | retries failed ones *default 1 worker*
|                   |
|--- Remote files <-|     <-| Filehandlers specified by the user
|--- Local files  <-|       | transform / handle uploaded files. 
       (http)               | Eg. Uploading to remote services,
                            | resizing images, converting sound,
                            | video, generating tts or just making
                            | cached versions of db files to the
                            | filesystem.
```

##How to use?

####1. Install:
```
    mrt add collectionFS
```
*Requires `Meteorite` from [atmosphere.meteor.com](https://atmosphere.meteor.com)*

####2. Create model: [client, server]
```js
    ContactsFS = new CollectionFS('contacts');
```
*You can still create a `Contacts = new Meteor.Collection('contacts')` since GridFS maps on `contacts.files` and `contacts.chunks`*

####3. Adding security to model: [client, server]
*This is only needed when using `accounts-...` and you have removed the `insecure` package.*
```js
    ContactsFS.allow({
      insert: function(userId, myFile) { return userId && myFile.owner === userId; },
      update: function(userId, files, fields, modifier) {
            return _.all(files, function (myFile) {
              return (userId == myFile.owner);

        });  //EO iterate through files
      },
      remove: function(userId, files) { return false; }
    });
```
*The collectionFS supports functions `.allow`, `.deny`, `.find`, `findOne` used when subscribing/ publishing from server.* 
*It's here you can add restrictions, for example allowed content-types, file sizes, etc.*
*`.update`, `.remove` are also supported, `remove` removes all chunks and versions related to the original file.*


####4. Disabling autopublish: 
*If you would rather not autopublish all files, you can turn off the autopublish option. This is useful if you want to limit the number of published documents or the fields that get published.*

#####Disabling autopublish: [client, server]
```js
  ContactsFS = new CollectionFS('contacts', { autopublish: false });
```
#####Example [server]
```js
    // Disable autopublish
    ContactsFS = new CollectionFS('contacts', { autopublish: false });

    // Example #1 - manually publish with an optional param
    Meteor.publish('listContactsFiles', function(filter) {
      // sort by handedAt time and only return the filename, handledAt and _id fields
      return ContactsFS.find({ complete: filter.completed }, {
              sort:{ handledAt: 1 }, 
              fields: { _id: 1, filename: 1, handledAt: 1},
              limit: filter.limit
      })
    });

    // Example #2 - limit results and only show users files they own
    Meteor.publish('myContactsFiles', function() {
      if (this.userId) {
        return ContactsFS.find({ owner: this.userId }, { limit: 30 });
      }
    });    
```
*Note: It's possible to set one more option server-side: `ContactsFS = new CollectionFS('contacts', { maxFilehandlers: 1 });` - This will set the maximum simultaneous file handlers on the server, in total, despite number of collections.*

#####Example [client]
```js
    // Disable autopublish / autosubscribe
    ContactsFS = new CollectionFS('contacts', { autopublish: false});

    // Example #1 - manually subscribe and show completed only 
    // (goes with server example #1 above)

    // Use session for setting filter options
    Session.setDefault('myFilter', { completed: true, limit: 30 });

    // Make subscription depend on the current filter
    Deps.autorun(function() {
      var filter = Session.get('myFilter');
      Meteor.subscribe('listContactsFiles', filter);
    });
```

##Uploading files
####1. Adding the view:
```html
    <template name="queControl">
      <h3>Select file(s) to upload:</h3>
      <input name="files" type="file" class="fileUploader" multiple>
    </template>
```

####2. Adding the controller: [client]
```js
    Template.queControl.events({
      'change .fileUploader': function (e) {
         var files = e.target.files;
         for (var i = 0, f; f = files[i]; i++) {
           ContactsFS.storeFile(f);
         }
      }
    });
```
*ContactsFS.storeFile(f) returns fileId or null, actual downloads are spawned as "threads". It's possible to add metadata: `storeFile(file, {})` — callback or event listeners are on the todo*.

##Downloading files
####1. Adding the view:
```html
    <template name="fileTable">
      {{#each Files}}
        <a class="btn btn-primary btn-mini btnFileSaveAs">Save as</a>{{filename}}<br/>
      {{else}}
        No files uploaded
      {{/each}}
    </template>
```

####2. Adding the controller: [client]
```js
    Template.fileTable.events({
      'click .btnFileSaveAs': function() {
        ContactsFS.retrieveBlob(this._id, function(fileItem) {
          if (fileItem.blob)
            saveAs(fileItem.blob, fileItem.filename)
          else
            saveAs(fileItem.file, fileItem.filename);
        });
      } //EO saveAs
    });
```
*In the future only a blob will be returned, this will return local file if available. The `Save as` calls [Filesaver.js](https://github.com/eligrey/FileSaver.js) by [Eli Grey](http://eligrey.com). It doesn't work on iPad.*

####3. Adding controller helper: [client]
```js
    Template.fileTable.helpers({
      Files: function() {
        return ContactsFS.find({}, { sort: { uploadDate:-1 } });
      }
    });
```
*There are some `widgets` / `components` (e.g. gui elements for uploading files, via drag & drop) in the works.*

####4. Store a file server-side
```js
var myText = 'Hello world, I wrote this..:)';
var buffer = Buffer(myText.length);

for (var i = 0; i < myText.length; i++)
  buffer[i] = myText.charCodeAt(i);

ContactsFS.storeBuffer('My server uploaded file.txt', buffer, { 
  // Set a contentType (optional)
  contentType: 'text/plain',
  // Set a user id (optional)
  owner: 'WAaPHfyfgHGaeJ5kK',
  // Stop live update of progress (optional, defaults to false)     
  noProgress: true,
  // Attach custom data to the file  
  metadata: { text: 'some stuff' }
});
```
*A rough example to illustrate the API.*

####5. Retrieve a file server-side
```js
var blob = ContactsFS.retrieveBuffer(fileId); // Returns a Buffer

// Get additional info from the file record
var fileRecord = ContactsFS.findOne(fileId);
```

###Create server cache/versions of files and get an url reference
Filehandlers are server-side functions that makes caching versions easier. The functions are run and handed a file record and a blob / ```Buffer``` containing all the bytes.

* Return a blob and it gets named, saved and put in database while the user can continue. When files are created the files are updated containing link to the new file — all done reactively live.
* If only custom metadata is returned without a blob / Buffer then no files saved but metadata is saved in database.
* If null returned then only filehandler name and a date is saved in database.
* If false returned the filehandler failed and it will be resumed later

####Options
*Each filehandler is handed a options object.*
```js
options: {
  blob,              // Type of node.js Buffer() 
  fileRecord: {
    chunkSize : self.chunkSize, // Default 256kb ~ 262.144 bytes
    uploadDate : Date.now(),  // Client set date
    handledAt: null,          // datetime set by Server when handled
    fileHandler:{},           // fileHandler supplied data if any
    md5 : null,               // Not yet implemented
    complete : false,         // countChunks == numChunks
    currentChunk: -1,         // Used to coordinate clients
    owner: Meteor.userId(),
    countChunks: countChunks, // Expected number of chunks
    numChunks: 0,             // number of chunks in database
    filename : file.name,     // Original filename
    length: ''+file.size,     // Issue in Meteor
    contentType : file.type,
    encoding: encoding,       // Default 'utf-8'
    metadata : (options) ? options : null,  // Custom data
    /* TODO:
    startedAt: null,          // Start timer for upload start
    endedAt: null,            // Stop timer for upload ended
    */
  },
  destination: function, // Check below
  sumFailes: 0..3 (times filehandler failed in this recovery session)
}
```
####options.destination - function
*filehandlers are presented with a helper function for handling paths - all paths can be custom, but it's recommended to use those returned by `destination()`*
`options.destination( [extension] )` takes an optional `extension` e.g.:
```js
  var dest = options.destination('jpg'); // otherwise original extension is used
```
Object returned:
```js
  dest == {
    serverFilename: '/absolute/path/uniqename.jpg', // Unix or windows based
    fileData: {
      url: '/web/url/uniqename.jpg',
      extension: 'jpg'
    }
  }
```
The `destination` helper gets handy e.g. when manually saving an image from within the filehandler.
```js
  Filesystem.fileHandlers({
    soundToWav: function(options) {
      // Manipulate file, convert it to wav
      var dest = options.destination('wav');
      writeFileToDisk(dest.serverFilename, blob);

      // Save correct reference to database by returning url and extension - but no blob
      return dest.fileData;
    }
  });
```

More examples follows, converters are to come:

```js
Filesystem.fileHandlers({
  default1: function(options) { //Options contains blob and fileRecord — same is expected in return if should be saved on filesytem, can be modified
    console.log('I am handling 1: '+options.fileRecord.filename);
    return { blob: options.blob, fileRecord: options.fileRecord }; //if no blob then save result in fileHandle (added createdAt)
  },
  default2: function(options) {
    if (options.fileRecord.len > 5000000 || options.fileRecord.contentType != 'image/jpeg') //Save som space, only make cache if less than 1Mb
      return null; //Not an error as if returning false, false would be tried again later...
    console.log('I am handling 2: '+options.fileRecord.filename);
    return options; 
  },
  size40x40: function(options) {
    return null;
    // Use Future.wrap for handling async
    /*var im = Npm.require('imagemagick'); // Add imagemagick package
    im.resize({
                srcData: options.blob,
                width: 40
           });*/
    console.log('I am handling: '+options.fileRecord.filename+' to...');
    return { extension: 'jpg', blob: options.blob, fileRecord: options.fileRecord }; //or just 'options'...
  },
  size100x100gm: function(options) {
    if (options.fileRecord.contentType != 'image/jpeg')
      return null; // jpeg files only  

    // Use Future.wrap for handling async
    /*
    var dest = options.destination('jpg').serverFilename; // Set optional extension

    var gm = Npm.require('gm'); // GraphicsMagick required need Meteor package
    gm(options.blob, dest).resize(100,100).quality(90).write(dest, function(err) {
        if(err) {
          // console.log('GraphicsMagick error ' + err);
          return false; 
          // False will trigger rerun, could check options.sumFailes
          // if we only want to rerun 2 times (default limit is 3,
          // but sumFailes is reset at server idle + wait period)
        }
        else {
          // console.log('Finished writing image.');
          return destination('jpg').fileData; // We only return the url for the file, no blob to save since we took care of it
        }
      });
    */
    // I failed to deliver a url for this, but don't try again
    return null;
  }
});
```
*This is brand new on the testbed. The future brings easy image handling shortcuts to Imagemagick and maybe some sound/video conversion and integrated uploads to Google Drive, Dropbox, etc.*

###Future:
* Handlebar helpers? `{{fileProgress}}`, `{{fileInQue}}` etc.
* Test server-side handling of image size, etc.
* When there is a hot code deploy the queue halts, which could be tackled in future version of Meteor.
* CollectionFS deviates from GridFS by using string-based files.length (Meteor are working on this issue).
* Prepare ability for special version caching options creating converting images, docs, tts, sound, video, remote server upload etc.
* Make Meteor packages for `GraphicsMagick`, etc.

###Notes:
* This is made as `Make it work, make it fast`, well it just got very fast! *Need to test if it's actually faster than regular upload.*
* No test suite — any good ones for Meteor?
* Current code client side contains relics and will have a make-over one of these days.