#This is the 0.3.x dev preview!! [![Build Status](https://travis-ci.org/raix/Meteor-CollectionFS.png?branch=master)](https://travis-ci.org/raix/Meteor-CollectionFS) [![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UX67TUAP29SML)
It's rough on the edges, please checkout the milestones for progress indication.

## Where can I get the older versions?
All versions are tagged but might not work with the latest version of Meteor.

To use the version 1 of `collectionFS` please tryout [Eric's updated fork](https://github.com/aldeed/Meteor-CollectionFS)

I'm working hard on the new version, primary focus is on the code at the moment so docs are somewhat limited.

Kind regards Morten

#CollectionFS
CollectionFS adds simple yet robust file uploading and downloading abilities to your Meteor web app. It is a mix of [Meteor.Collection](http://docs.meteor.com/#meteor_collection) and MongoDB's [GridFS](http://docs.mongodb.org/manual/core/gridfs/). CollectionFS stores files in your MongoDB database but also provides the ability to easily store files on the server filesystem or a remote filesystem.

##Example
Here is a [live example](http://collectionfs.meteor.com/) of a file manager app implemented using CollectionFS.

##Examples getting started
* [Drag&drop with one filehandler](https://github.com/mxab/cfsfileurl-example) by __@mxab__
* [Multiple filehandlers](https://github.com/mxab/cfs-multi-filehandler-example) by __@mxab__
* [Filemanager demo](https://github.com/raix/Meteor-cfs-example-filemanager) by __@raix__

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
    insert: function(userId, file) { return userId && file.owner === userId; },
    update: function(userId, files, fields, modifier) {
        return _.all(files, function (file) {
            return (userId == file.owner);
        });  //EO iterate through files
    },
    remove: function(userId, files) { return false; }
});
```

Using the file object that is passed to the insert function, you can also restrict based on file characteristics like content types and file size. Alternatively, you can use filters for this. (See the following step.)

###Step 4: Set Up Filters (client and server)

To filter uploads to a CollectionFS so that only certain content types or extensions are allowed, you can use `CollectionFS.filter()`. Refer to the API reference for details. Here's an example:

```js
ContactsFS.filter({
    allow: {
        contentTypes: ['image/*']
    }
});
```

###Step 5: Publish Files
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
or
```js
Template.queueControl.events({
    'change .fileUploader': function (e) {
        var files = e.target.files;
        ContactsFS.storeFiles(files);
    }
});
```
`storeFile` returns immediately with a fileId, or with null if there was a problem. The actual uploads are handled by pseudo-threads. When an upload finishes, client templates that list files or file information are updated live through reactivity.

`storeFiles` is a convenience method for storing multiple files at once and returns an array of fileIds.

If you want to store additional metadata for each file, provide the data in the second parameter.
```js
storeFile(file, {
   name: "My File"
})
```

There are currently no available callbacks or event listeners for the upload process. These will be added in a future release.

###Download a File to the Client
First, create a new template for the file link.
```html
<template name="fileTable">
    {{#each files}}
    {{cfsDownloadButton "ContactsFS" class="btn btn-primary btn-mini" content=filename}}
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
And that's it! The button is created by the helper and wired up
with the necessary click event to begin downloading the file to the browser.

For saving, the helper uses [FileSaver.js](https://github.com/eligrey/FileSaver.js) by [Eli Grey](http://eligrey.com). It doesn't work on iPad.
If you prefer, you can call `CollectionFS.retrieveBlob()` yourself and use your own saving method with the result.

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

##Common API Reference

The following Meteor.Collection methods are supported, and work identically:
* `find()`
* `findOne()`
* `update()`
* `remove()`
* `allow()`
* `deny()`

Instead of `insert()`, use `storeFile()` or `storeFiles()`.

###CollectionFS.filter(filter)
* **filter**: (Required) An object defining file content types and/or extensions that should be allowed or denied, and optionally a maximum file size in bytes.

Call this in a common javascript file. This is the format of the `filter` object:

```js
{
    allow: {
        extensions: [],
        contentTypes: []
    },
    deny: {
        extensions: [],
        contentTypes: []
    },
    maxSize: 1048576
}
```

You can mix and match filtering based on extension or content types.
The contentTypes array also supports "image/*" and "audio/*" and "video/*" like
the "accepts" attribute on the HTML5 file input element. `storeFile()` and 
`storeFiles()` automatically check each file against these rules before uploading
it, or you can call `CollectionFS.fileIsAllowed()`, passing in a file record object,
if you need to check a file yourself.

If a file extension or content type matches any of those listed in `allow`, it is allowed. If not,
it is denied. If it matches both `allow` and `deny`, it is denied. Typically, you would
use only `allow` or only `deny`, but not both. If you do not call `filter()`, all files are allowed,
as long as they pass the tests in `allow()` and `deny()`.

The file extensions must be specified without a leading period.

###Invalid Event (client or server)

You can define a function to be called whenever an "invalid" event is dispatched. This happens when a file fails the validation check defined
by `CollectionFS.filter`.

This function should accept two arguments:
* **type**: One of the enums in CFSErrorType, depending on which check the file failed.
* **fileRecord**: The fileRecord object.

Typically you might use this on the client to display an error message to the user, or on the server to log the failure.

For example:

```javascript
Songs.events({
  'invalid': function(type, fileRecord) {
    if (type === CFSErrorType.disallowedContentType || type === CFSErrorType.disallowedExtension) {
      console.log("Sorry, " + fileRecord.filename + " is not the type of file we're looking for.");
    } else if (type === CFSErrorType.maxFileSizeExceeded) {
      console.log("Sorry, " + fileRecord.filename + " is too big to upload.");
    }
  } 
});
```

##Client API Reference

###CollectionFS.storeFile(file, metadata)
* **file**: (Required) The browser filehandle.
* **metadata**: An object with any custom data you want to save in the file record for later use.

`storeFile` returns immediately with a fileId, or with null if there was a problem. The actual uploads are handled by pseudo-threads.

###CollectionFS.storeFiles(files, metadata, callback)
* **files**: (Required) The browser files array.
* **metadata**: (Optional) An object with any custom data you want to save in the file record for later use, or a function that accepts one parameter, the file object, and returns the metadata object.
* **callback**: (Optional) A function to be called after storing each file when looping over the files. This callback is passed two parameters, `file`, which is the browser file object, and `fileId`, which is the CollectionFS ID for that file.

`storeFiles` returns immediately with an array of fileIds, or with null if there was a problem. The actual uploads are handled by pseudo-threads. This is a convenience function for calling `storeFile` multiple times; however, if you need to store metadata with each file, you will have to do the looping yourself and use `storeFile`.

###CollectionFS.retrieveBlob(fileId, callback)
* **fileId**: (Required) The ID of the file
* **callback**: (Required) A function to handle the file BLOB after it's downloaded.

`callback` is passed one argument, `fileItem`, which is a container for the file. Either fileItem.blob or fileItem.file will be available. fileItem.file is used if the file is already stored locally. In the future, this will be improved so that fileItem.blob is always set.

`fileItem` also has properties _id, countChunks, and length.

###CollectionFS.acceptDropsOn(templateName, selector, metadata, callback)
* **templateName**: (Required) The template in which the element that should accept file drops can be found.
* **selector**: (Required) The CSS selector that matches the element that should accept file drops.
* **metadata**: (Optional) Same as the `CollectionFS.storeFiles` metadata argument. Passed to `CollectionFS.storeFiles` for the files that are dropped. Can be a getter function.
* **callback**: (Optional) Same as the `CollectionFS.storeFiles` callback argument. Passed to `CollectionFS.storeFiles` for the files that are dropped.

Sets up all of the elements matching `selector` to support dropping of one or more files onto them. As files are dropped onto these elements, they are automatically stored in the CollectionFS with the given metadata, and then the callback is called for each one.

For example:

```html
<template name="audioList">
   <div class="audioList">
      {{#if cfsHasFiles "Songs"}}
      <table>
         <thead>
            <th>ID</th>
            <th>Size</th>
            <th>Filename</th>
            <th>Content type</th>
            <th>Owner</th>
         </thead>
         <tbody>
            {{#each cfsFiles "Songs"}}
            {{> song}}
            {{/each}}
         </tbody>
      </table>
      {{else}}
      <div>You have not added any audio files.</div>
      {{/if}}
   </div>
</template>
```

```js
Songs = new CollectionFS("songs", {autopublish: false});
if (Meteor.isClient) {
  Songs.acceptDropsOn("audioList", ".audioList");
}
```

####Example of a metadata getter function:
```js
  Songs.acceptDropsOn('audioList', '.audioList',
    // Metadata getter
    function(event, temp) {
      // This function would be run with `this` from the template
      // it would return the metadata containing the `audioListItemId`
      return { audioListItemId: this._id }
    }
  );
```

##Server API Reference

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

##Built-In Handlebars Helpers

A number of handlebar helpers are available to help you generate UI elements related to the files stored in a CollectionFS.

###cfsFile

```js
{{cfsFile "Collection" fileId}}
```

Returns the file object with ID fileId in the "Collection" CFS.

###cfsFiles

```js
{{cfsFile "Collection"}}
```

Returns a cursor for the CFS. Doesn't support any limiting, sorting, etc. except whatever you're doing in `Meteor.publish()`.

###cfsHasFiles

```js
{{#if cfsHasFiles "Collection"}}
```

Returns true if the CFS has any files (as filtered by `Meteor.publish()`).

###cfsIsUploading

```js
(1) {{cfsIsUploading "Collection"}} (with file as current context)
(2) {{cfsIsUploading "Collection" file=file}}
(3) {{cfsIsUploading "Collection" fileId=fileId}}
```

Returns true if the file is currently being uploaded to the specified CFS.

###cfsIsDownloading

```js
(1) {{cfsIsDownloading "Collection"}} (with file as current context)
(2) {{cfsIsDownloading "Collection" file=file}}
(3) {{cfsIsDownloading "Collection" fileId=fileId}}
```

Returns true if the file is currently being downloaded from the specified CFS.

###cfsIsDownloaded

```js
(1) {{cfsIsDownloaded "Collection"}} (with file as current context)
(2) {{cfsIsDownloaded "Collection" file=file}}
(3) {{cfsIsDownloaded "Collection" fileId=fileId}}
```

Returns true if the file has been downloaded from the specified CFS.

###cfsIsComplete

```js
(1) {{cfsIsComplete "Collection"}} (with file as current context)
(2) {{cfsIsComplete "Collection" file=file}}
(3) {{cfsIsComplete "Collection" fileId=fileId}}
```

Returns true whenever neither a download nor an upload is happening for the given file.

###cfsQueueProgress

```js
(1) {{cfsQueueProgress "Collection"}} (with file as current context)
(2) {{cfsQueueProgress "Collection" file=file}}
(3) {{cfsQueueProgress "Collection" fileId=fileId}}
```

Returns the percentage progress of the current operation for the file, either upload or download.

###cfsQueueProgressBar

```js
(1) {{cfsQueueProgressBar "Collection"}} (with file as current context)
(2) {{cfsQueueProgressBar "Collection" file=file}}
(3) {{cfsQueueProgressBar "Collection" fileId=fileId}}
```

Creates an HTML5 `<progress>` element that shows the progress of the current operation for the file, either upload or download.
You can optionally specify `id` or `class` attributes to help you style it. For example:

```html
{{#each cfsFiles "Songs"}}
{{#if cfsIsUploading "Songs"}}
{{cfsQueueProgressBar "Songs" class="uploadBar"}}<br/><em>Uploading...</em>
{{/if}}
{{#if cfsIsDownloading "Songs"}}
{{cfsQueueProgressBar "Songs" class="downloadBar"}}<br/><em>Downloading...</em>
{{/if}}
{{/each}}
```

Older browsers will simply display the percentage.

###cfsIsPaused

```js
{{cfsIsPaused "Collection"}}
```

Returns true if the queue for the CFS is paused.

###cfsIsOwner

Is current user the owner of the file?

```js
(1) {{cfsIsOwner}} (with file as current context)
(2) {{cfsIsOwner file=file}}
(3) {{cfsIsOwner fileId=fileId collection="Collection"}}
```

Is user with userId the owner of the file?

```js
(1) {{cfsIsOwner userId=userId}} (with file as current context)
(2) {{cfsIsOwner file=file userId=userId}}
(3) {{cfsIsOwner fileId=fileId collection="Collection" userId=userId}}
```

###cfsFormattedSize

```js
(1) {{cfsFormattedSize formatString=formatString}} (with file as current context)
(2) {{cfsFormattedSize file=file formatString=formatString}}
(3) {{cfsFormattedSize fileId=fileId collection="Collection" formatString=formatString}}
```

Formats the file size of the given file using any format string supported by numeral.js. If you don't specify formatString,
a default format string `'0.00 b'` is used.

###cfsFileHandlers

```js
(1) {{cfsFileHandlers}} (with file as current context)
(2) {{cfsFileHandlers file=file}}
(3) {{cfsFileHandlers fileId=fileId collection="Collection"}}
```

Returns an array of filehandlers for the file, suitable for use with `#each`.

###cfsFileUrl

```js
(1) {{cfsFileUrl "defaultHandler"}} (with file as current context)
(2) {{cfsFileUrl "defaultHandler" file=file}}
(3) {{cfsFileUrl "defaultHandler" fileId=fileId collection="Collection"}}
```

Returns the file URL for the given file, as assigned by the given filehandler.

###cfsDownloadButton

```js
(1) {{cfsDownloadButton "Collection"}} (with file as current context)
(2) {{cfsDownloadButton "Collection" file=file}}
(3) {{cfsDownloadButton "Collection" fileId=fileId}}
```

Creates an HTML `<button>` element for the given file which, when clicked, initiates downloading
of the file by the browser. This uses a FileSaver shim which should support most modern browsers.

You can optionally specify `id` or `class` attributes to help you style it, and a `content` attribute
to use as the button element content. If you don't specify content, the button will say "Download".

##Upcoming Features
An overhaul and many fixes and new features will hopefully be completed by July 2013.
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
__@aldeed, @eprochasson, @emgee3, @nhibner, @mitar, @petrocket__  
*ranked by last commit*
(Are you missing from the list? File it as an issue or submit a pull request.)
