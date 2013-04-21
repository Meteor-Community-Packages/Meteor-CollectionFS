#CollectionFS
Is a simple way of handling files on the web in the Meteor environment

Have a look at [Live example](http://collectionfs.meteor.com/)

It's work in progress, I'll take pull requests, feature requests and feedback for optimizing stability and speed

CollectionFS is a mix of both Meteor.Collection and GridFS mongoDB.
Using Meteor and gridFS principles we get:
* Security handling
* Handling sharing
* Restrictions eg. only allow certain content types, fields, users etc.
* Reactive data, the collectionFS's methods should all be reactive
* Ability for the user to resume upload after connection loss, browser crash or cola in keyboard
* At the moment files are loaded into the client as Blob universal way of handling large binary data
* Create multiple cached versions, sizes or formats of your files and get an url to the file - or upload files to another service / server

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

##Contributions
Do you have idears, issues, documentation, fixes or pull requests? All is wellcome for making collectionFS faster, more versatile and easier to use.

###A special thanks and credit goes to code contributors
__@nhibner, @mitar, @petrocket__  
*Ranked by last commit, are you missing from the list? file it as an issue or make a PR :)*


##How to use?

####1. Install:
```
    mrt add collectionFS
```
*Requires `Meteorite` get it at [atmosphere.meteor.com](https://atmosphere.meteor.com)*

####2. Create model: [client, server]
```js
    ContactsFS = new CollectionFS('contacts');
```
*You can still create a `Contacts = new Meteor.Collection('contacts')` since gridFS maps on eg. `contacts.files` and `contacts.chunks`*

####3. Adding security in model: [client, server]
*Only needed when using `accounts-...` (eg. removed the `insecure` package)*
```js
    ContactsFS.allow({
      insert: function(userId, myFile) { return userId && myFile.owner === userId; },
      update: function(userId, files, fields, modifier) {
            return _.all(files, function (myFile) {
              return (userId == myFile.owner);

        });  //EO interate through files
      },
      remove: function(userId, files) { return false; }
    });
```
*The collectionFS supports functions `.allow`, `.deny`, `.find`, `findOne` used when subscribing/ publishing from server* 
*It's here you can add restrictions eg. on content-types, filesizes etc.*
*`.update`, `.remove` are also supported, `remove` removes all chunks and files related to the file removed*


####4. Disabling autopublish: 
*If you would rather not autopublish all files, you can turn off the autopublish option.  This is useful if you want to limit the number of published documents or the fields that get published*

#####Disabling autopublish: [client, server]
```js
  ContactsFS = new CollectionFS('contacts', { autopublish: false });
```
#####Example [server]
```js
    // Disable autopublish
    ContactsFS = new CollectionFS('contacts', { autopublish: false });

    // example #1 - manually publish with an optional param
    Meteor.publish('listContactsFiles', function(filter) {
      // sort by handedAt time and only return the filename, handledAt and _id fields
      return ContactsFS.find({ complete: filter.completed }, {
              sort:{ handledAt: 1 }, 
              fields: { _id: 1, filename: 1, handledAt: 1},
              limit: filter.limit
      })
    });

    // example #2 - limit results and only show users files they own
    Meteor.publish('myContactsFiles', function() {
      if (this.userId) {
        return ContactsFS.find({ owner: this.userId }, { limit: 30 });
      }
    });    
```
*Note: It's possible to set one more option serverside: `ContactsFS = new CollectionFS('contacts', { maxFilehandlers: 1 });` - This will set max simultane filehandlers in total on the server, dispite collection*

#####Example [client]
```js
    // Disable autopublish / autosubscribe
    ContactsFS = new CollectionFS('contacts', { autopublish: false});

    // example #1 - manually subscribe and show completed only 
    // (goes with example #1 above)

    // Use session for setting filter options
    Session.setDefault('myFilter', { completed: true, limit: 30 });

    // Make subscription depend on the current filter
    Deps.autorun(function() {
      var filter = Session.get('myFilter');
      Meteor.subscribe('listContactsFiles', filter);
    });
```

##Uploading file
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
*ContactsFS.storeFile(f) returns fileId or null, actual downloads are spawned as "threads". It's possible to add metadata: `storeFile(file, {})` - callback or eventlisteners are on the todo*

##Downloading file
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
*In future only a blob will be returned, this will return local file if available. The `Save as` calls the Filesaver.js by Eli Grey, http://eligrey.com - It doesn't work on iPad*

####3. Adding controller helper: [client]
```js
    Template.fileTable.helpers({
      Files: function() {
        return ContactsFS.find({}, { sort: { uploadDate:-1 } });
      }
    });
```
*There are some in the works for `widgets` / `components` eg. gui elements for uploading files, ex. via drag & drop*

##Api for storing and retrieving files

###Clientside

####Store a file
```js
  Contacts.storeFile(file, metadata);
```
*The file is the browser filehandle, and metadata is custom data to save in the file record for later use*

####Retrieve a file
```js
  Contacts.retrieveBlob: function(fileId, callback);
```
Example:
```js
  Contacts.retrieveBlob: function(fileId, function(fileItem) {
    // eiter fileItem.blob or fileItem.file is returned (in future a blob should allways be available)
    // fileItem._id
    // fileItem.countChunks
    // fileItem.length   
  });
```

####TODO:
The clientside code is going for a rewrite, for a better and more versatile api
* More options for storing and retrieving data
* More control over the queue eg. trottling the queue
* Make a dropbox like example of it

###Serverside
####Store a file
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
  // Stop live update of progress (optional default to false)     
  noProgress: true,
  // Attach custom data to the file  
  metadata: { text: 'some stuff' },
  // Set encoding (optional default 'utf-8')
  encoding: 'utf-8'
});
```
*A rough example to illustrate the api*

####Retrieve a file serverside
```js
var blob = ContactsFS.retrieveBuffer(fileId); // Returns a Buffer

// Get additional info from the file record
var fileRecord = ContactsFS.findOne(fileId);
```

##Filehandlers

###Create server cache/versions of files and get an url reference
Filehandlers are serverside functions that makes caching versions easier. The functions are run and handled a file record and a blob / ```Buffer``` containing all the bytes.
* Return a blob and it gets named, saved and put in database while the user can continue. When files are created the files are updated containing link to the new file - all done reactivly live.
* If only custom metadata is returned without a blob / Buffer then no files saved but metadata is saved in database.
* If null returned then only filehandler name and a date is saved in database.
* If false returned the filehandler failed and it will be resumed later

####Options
*Each filehandler is handed a options object*
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
`options.destination( [extension] )` takes an optional `extension` eg.:
```js
  var dest = options.destination('jpg'); // otherwise orginal extension is used
```
Object returned:
```js
  dest == {
    serverFilename: '/absolute/path/uniqname.jpg', // Unix or windows based
    fileData: {
      url: '/web/url/uniqname.jpg',
      extension: 'jpg'
    }
  }
```
The `destination` helper gets handy eg. when manually saving an image from within the filehandler.
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
  default1: function(options) { //Options contains blob and fileRecord - same is expected in return if should be saved on filesytem, can be modified
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
    /*var im = npm.require('imagemagick'); // Add imagemagick package
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

    var gm = npm.require('gm'); // GraphicsMagick required need Meteor package
    gm( options.blob, dest).resize(100,100).quality(90).write(dest, function(err) {
        if(err) {
          // console.log 'GraphicsMagick error ' + err;
          return false; 
          // False will trigger rerun, could check options.sumFailes
          // if we only want to rerun 2 times (default limit is 3,
          // but sumFailes is reset at server idle + wait period)
        }
        else {
          // console.log 'Finished writing image.';
          return destination('jpg').fileData; // We only return the url for the file, no blob to save since we took care of it
        }
      });
    */
    // I failed to deliver a url for this, but don't try again
    return null;
  }
});
```
*This is brand new on the testbed, future brings easy image handling shortcuts to imagemagic, maybe som sound/video converting and some integration for uploading to eg. google drive, dropbox etc.*

###Future:
* Handlebar helpers? `{{fileProgress}}`, `{{fileInQue}}` etc.
* Test server side handling image size etc.
* When code hot deploy the que halts, could be tackled in future version of Meteor
* Deviates from gridFS by using string based files.length (Meteor are working on this issue)
* Prepare ability for special version caching options creating converting images, docs, tts, sound, video, remote server upload etc.
* Make Meteor packages for `GraphicsMagick` etc.

###Notes:
* This is made as `Make it work, make it fast`, well it just got very fast! *need to test if it's actually faster than regular upload*
* No test suite - any good ones for Meteor?
* Current code client side contains relics and will have a makeover one of these days
