#CollectionFS
CollectionFS adds simple yet robust file uploading and downloading abilities to your Meteor web app. It is a mix of [Meteor.Collection](http://docs.meteor.com/#meteor_collection) and MongoDB's [GridFS](http://docs.mongodb.org/manual/core/gridfs/). CollectionFS stores files in your MongoDB database but also provides the ability to easily store files on the server filesystem or a remote filesystem.

##Features
* Authorizing uploads and downloads based on Meteor user accounts
* Sharing
* Restrictions (e.g., allow only certain content types, fields, users, etc.)
* Reactive methods
* Ability to resume uploads after connection loss, browser crash, or cola in keyboard
* Files are loaded on the client as a BLOB, a universal way of handling large binary data
* Supports custom file handlers that you can use to:
    * create one or more cached files
    * resize images
    * convert files to another format
    * transfer files to another service or server
    * anything else you want to do!

##Design Overview
```
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
       (http)               | Eg. uploading to remote services,
                            | resizing images, converting sound,
                            | video, generating tts or just making
                            | cached versions of db files to the
                            | filesystem.
```

##Example
Here is a [live example](http://collectionfs.meteor.com/) of a file manager app implemented using CollectionFS.

##Getting Started

###Step 1: Add CollectionFS to Your Project
First, install Meteorite from [atmosphere.meteor.com](https://atmosphere.meteor.com) if you haven't already. Meteorite is a Meteor package manager that allows you to install many unofficial packages, including CollectionFS.

Then:
```
mrt add collectionFS
```

###Step 2: Create a CollectionFS Model (client and server)
In the client/server Javascript file where you define the data model for your project, add the following line for each collection that needs to store files. In this example, you might be storing documents related to contacts.
```js
ContactsFS = new CollectionFS('contacts', { autopublish: false });
```
*Setting `autopublish` to false is not required, but you will usually want to do this to limit the number of published documents or define which fields should be published. If you have removed the `autopublish` Meteor package, you do not need to set this since nothing will be autopublished by default.*

It's important to note that CollectionFS extends the collection (in this example, "contacts"), creating contacts.files and contacts.chunks. This means that you can also create a normal `Meteor.Collection` with the same name if necessary for your app. For example:
```js
Contacts = new Meteor.Collection('contacts');
```

###Step 3: Configure Authorization (client and server)
*This step is necessary only if you are using one of the `accounts- * ` packages and you have removed the `insecure` package.*

In the client/server Javascript file where you define the data model for your project, use the `allow` and `deny` methods to define which users may insert, update, and remove files. This is no different from defining authorization for a normal `Meteor.Collection`.

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

This is also a good place to add other restrictions such as allowed content types and maximum file size.

###Step 4: Publish Files
Assuming that you are not autopublishing CollectionFS documents (see step 2), you now need to define which documents and fields should be published to each client.

In a server Javascript file, you can write `publish` functions that return the results of `find` or `findOne` calls to determine which files will be visible on each client. Then in a client Javascript file, you can subscribe to those document sets.

####Simple Example
```js
// in server.js
// limit results and only show users files they own
Meteor.publish('myContactsFiles', function() {
    if (this.userId) {
        return ContactsFS.find({ owner: this.userId }, { limit: 30 });
    }
});

// in client.js
Meteor.subscribe('myContactsFiles');
```

####Example With Client Side Filter Rules and Reactivity
```js
// in server.js
Meteor.publish('listContactsFiles', function(filter) {
    return ContactsFS.find({ complete: filter.completed }, { // publish only complete or only incomplete, depending on client setting
        sort:   { handledAt: 1 }, // sort by handledAt time
        fields: { _id: 1, filename: 1, handledAt: 1}, // publish only the filename, handledAt, and _id fields
        limit:  filter.limit // limit the number of files published, depending on client setting
    })
});

// in client.js
// Use session for setting filter options
Session.setDefault('myFilter', { completed: true, limit: 30 });

// Subscription will be updated whenever myFilter session value changes
Deps.autorun(function() {
    var filter = Session.get('myFilter');
    Meteor.subscribe('listContactsFiles', filter);
});
```

##Common Tasks
Now that you have everything set up, you're probably excited to start transferring some files. Here are examples of how to achieve the most common tasks.

###Upload a File From the Client
First, create a new template for the file upload input.
```html
<template name="queueControl">
    <h3>Select file(s) to upload:</h3>
    <input name="files" type="file" class="fileUploader" multiple>
</template>
```
Next, define an event handler that stores the files after the user selects them.
```js
Template.queueControl.events({
    'change .fileUploader': function (e) {
        var files = e.target.files;
        for (var i = 0, f; f = files[i]; i++) {
            ContactsFS.storeFile(f);
        }
    }
});
```
`storeFile` returns immediately with a fileId, or with null if there was a problem. The actual uploads are handled by pseudo-threads. When an upload finishes, client templates that list files or file information are updated live through reactivity.

If you want to store additional metadata for each file, provide the data in the second parameter.
```js
storeFile(file, {})
```

There are currently no available callbacks or event listeners for the upload process. These will be added in a future release.

###Download a File to the Client
First, create a new template for the file link.
```html
<template name="fileTable">
    {{#each files}}
    <a class="btn btn-primary btn-mini btnFileSaveAs">Save as</a>{{filename}}<br/>
    {{else}}
    No files uploaded.
    {{/each}}
</template>
```
Next, provide the data context.
```js
//in client.js
Template.fileTable.files = function() {
    //show all files that have been published to the client, with most recently uploaded first
    return ContactsFS.find({}, { sort: { uploadDate:-1 } });
};
```
Now define an event handler for when the link is clicked.
```js
//in client.js
Template.fileTable.events({
    'click .btnFileSaveAs': function(e) {
        e.preventDefault();
        ContactsFS.retrieveBlob(this._id, function(fileItem) {
            if (fileItem.blob) {
                saveAs(fileItem.blob, fileItem.filename);
            } else {
                saveAs(fileItem.file, fileItem.filename);
            }
        });
    } //EO saveAs
});
```
We are checking whether the fileItem is a BLOB or a file because the local file may be returned if it's available. In the future, only a BLOB will be returned.

`saveAs` calls [Filesaver.js](https://github.com/eligrey/FileSaver.js) by [Eli Grey](http://eligrey.com). It doesn't work on iPad.

###Delete a File
You can call `remove` on the client or server to remove all chunks and versions related to the original file from the database.
```js
ContactsFS.remove(fileId);
```

###Store a File From the Server
You can also store files from the server side. You could, for example, retrieve a file from some external URL and save it to your database. Here is a rough example to illustrate:
```js
var myText = 'Hello world, I wrote this..:)';
var buffer = Buffer(myText.length);

for (var i = 0; i < myText.length; i++) {
    buffer[i] = myText.charCodeAt(i);
}

ContactsFS.storeBuffer('serverFile.txt', buffer, { 
    // Set a contentType (optional)
    contentType: 'text/plain',
    // Set a user id (optional)
    owner: 'WAaPHfyfgHGaeJ5kK',
    // Stop live update of progress (optional, defaults to false)     
    noProgress: true,
    // Attach custom data to the file  
    metadata: { text: 'some stuff' },
    // Set encoding (optional default 'utf-8')
    encoding: 'utf-8'
});
```

###Retrieve a File From the Server
You can also retrieve files from the server side. 
```js
// Get the file itself as a BLOB (Buffer)
var blob = ContactsFS.retrieveBuffer(fileId);

// Get additional info from the file record
var fileRecord = ContactsFS.findOne(fileId);
```

##API Reference

###CollectionFS.storeFile(file, metadata)
* **file**: (Required) The browser filehandle.
* **metadata**: An object with any custom data you want to save in the file record for later use.

`storeFile` returns immediately with a fileId, or with null if there was a problem. The actual uploads are handled by pseudo-threads.

###CollectionFS.retrieveBlob(fileId, callback)
* **fileId**: (Required) The ID of the file
* **callback**: (Required) A function to handle the file BLOB after it's downloaded.

`callback` is passed one argument, `fileItem`, which is a container for the file. Either fileItem.blob or fileItem.file will be available. fileItem.file is used if the file is already stored locally. In the future, this will be improved so that fileItem.blob is always set.

`fileItem` also has properties _id, countChunks, and length.

###CollectionFS.storeBuffer(fileName, buffer, options)
* **fileName**: (Required) The name of the file
* **buffer**: (Required) The bufferred content of the file
* **options**: All of these are optional.
    * **contentType**: The content (MIME) type of the file
    * **owner**: The user ID of the user who owns the document   
    * **noProgress**: `true` to prevent live updating of progress; default is `false`
    * **metadata**: An object containing any custom metadata you want to store with the file
    * **encoding**: The file encoding; default is `utf-8`

###CollectionFS.retrieveBuffer(fileId)
* **fileId**: (Required) The ID of the file
Returns a buffer.

##Filehandlers
Filehandlers are custom server-side functions that take a file record and a BLOB and do something with them. You can use them to convert files to other formats, process and convert images, store copies of the file on the filesystem, or upload files to remote services.

###Defining Filehandlers
To define a filehandler, use the `fileHandlers` function.
```js
  Filesystem.fileHandlers({
    fileHandler1: function(options) {
      //manipulate the file, save to disk, etc.
      return something;
    }
  });
```
###Possible Return Values
Depending on what the filehandler is doing, you can return different values.
* If you return a BLOB: It is named, saved, and stored in database while the user can continue. After the file is successfully stored, the client data and template is updated live.
* If you return metadata without a BLOB: The metadata is saved in the database without the file data.
* If you return a String, it will be used as the URL for that document (usefull if you generated your own file -- see file handlers examples with ImageMagick)
* If you return null: Only the filehandler name and a date is saved in the database.
* If you return false: This means the filehandler failed temporarily. It will be tried again later.

###Options
Each filehandler should accept one `options` argument. This contains the file data, information about the file, a `destination` helper function, and more.
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
    },
    destination: function,
    sumFailes: 0..3 (times filehandler failed in this recovery session)
}
```
####options.destination(extension)
This function returns the correct file path for saving the current file to the local filesystem. While you can use custom paths to store files, it's easiest and safest to use the path returned by this function.

If you want the file path to use a file extension that is different from the original file extension, pass the optional `extension` argument to `options.destination()`. For example:
```js
var dest = options.destination('jpg');
```
In this example, dest might be returned as
```js
dest = {
    serverFilename: '/absolute/path/uniquename.jpg', // Unix or Windows is supported
    fileData: {
        url: '/web/url/uniquename.jpg',
        extension: 'jpg'
    }
}
```

###Limiting Filehandlers
When defining your CollectionFS collection, you can optionally specify the maximum number of simultaneous file handlers you want on the server, in total, regardless of the number of collections.
```js
ContactsFS = new CollectionFS('contacts', { maxFilehandlers: 1 });
```

###Filehandler Examples

```js
Filesystem.fileHandlers({
  default1: function(options) { // Options contains blob and fileRecord — same is expected in return if should be saved on filesytem, can be modified
    console.log('I am handling default1: ' + options.fileRecord.filename);
    return { blob: options.blob, fileRecord: options.fileRecord }; // if no blob then save result in fileHandle (added createdAt)
  },
  default2: function(options) {
    if (options.fileRecord.len > 5000000 || options.fileRecord.contentType != 'image/jpeg') //Save some space, only make cache if less than 5MB
      return null; // Not an error as if returning false, false would be tried again later...
    console.log('I am handling default2: ' + options.fileRecord.filename);
    return options; 
  },
  size40x40: function(options) {
    //... Test that it's an actual image...
    
    // Uses meteorite package imagemagick.
    var destination = options.destination();
    Imagemagick.resize({
       srcData: options.blob,
       dstPath: destination.serverFilename, // Imagemagick will create the file for us.
       width: 40,
       height: 40
    });
    console.log('I am handling: ' + options.fileRecord.filename + ' to '. destination.serverFilename);
    
    // Return the url
    return destination.fileData;
  },
  size100x100gm: function(options) {
    if (options.fileRecord.contentType != 'image/jpeg')
      return null; // jpeg files only  

    // Use Future.wrap for handling async
    /*
    var dest = options.destination('jpg').serverFilename; // Set optional extension

    var gm = Npm.require('gm'); // GraphicsMagick required need Meteor package
    gm(options.blob, dest).resize(100,100).quality(90).write(dest, function(err) {
        if (err) {
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
  },
  soundToWav: function(options) {
    // Manipulate file, convert it to wav
    var dest = options.destination('wav');
    writeFileToDisk(dest.serverFilename, blob);
    
    // Save correct reference to database by returning url and extension — but no blob
    return dest.fileData;
  }
});
```

##Upcoming Features
An overhaul and many fixes and new features will hopefully be completed by July 2013.
* Handlebar helpers? `{{fileProgress}}`, `{{fileInQue}}` etc.
* Test server-side handling of image size, etc.
* When there is a hot code deploy the queue halts, which could be tackled in future version of Meteor.
* CollectionFS deviates from GridFS by using string-based files.length (Meteor are working on this issue).
* Prepare ability for special version caching options creating converting images, docs, tts, sound, video, remote server upload etc.
* Integrated uploads to Google Drive, Dropbox, etc.
* Make Meteor packages for `GraphicsMagick`, etc.
* More options for storing and retrieving data
* More control over the queue eg. trottling the queue
* Make a dropbox like example of client side
* Test suite — any good ones for Meteor?
* Current code client side contains relics and will have a make-over one of these days.

##Contributing
Do you have ideas, issues, documentation, fixes, or pull requests? Anyone is welcome to help make CollectionFS faster, more versatile, and easier to use.

###Special Thanks to Code Contributors
__@aldeed, @emgee3, @nhibner, @mitar, @petrocket__  
*ranked by last commit*
(Are you missing from the list? File it as an issue or submit a pull request.)
