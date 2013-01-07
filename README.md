#CollectionFS
Is a simple way of handling files on the web in the Meteor environment

Have a look at [Live example](http://collectionfs.meteor.com/)

CollectionFS is a mix of both Meteor.Collection and GridFS mongoDB.
Using Meteor and gridFS priciples we get:
* Security handling
* Handling sharing
* Restrictions eg. only allow certain content types, fields, users etc.
* Reactive data, the collectionFS's methods should all be reactive
* Abillity for the user to resume upload after connection loss, browser crash or cola in keyboard
* At the moment files are loaded into the client as Blob universal way of handling large binary data

##How to use?

####1. Install:
```
    mrt add collectionFS
```
*Requires ```Meteorite``` get it at [atmosphere.meteor.com](https://atmosphere.meteor.com)*

####2. Create model: [client, server]
```js
    ContactsFS = new CollectionFS('contacts');
```
*You can still create a ```Contacts = new Meteor.Collection('contacts')``` since gridFS maps on eg. ```contacts.files``` and ```contacts.chunks```*

####3. Adding security in model: [client, server]
*Only needed when using ```accounts-...``` (eg. removed the ```insecure``` package)*
```js
    Filesystem.allow({
      insert: function(userId, myFile) { return userId && myFile.owner === userId; },
      update: function(userId, files, fields, modifier) {
            return _.all(files, function (myFile) {
              return (userId == myFile.owner);

        });  //EO interate through files
      },
      remove: function(userId, files) { return false; }
    });
```
*The collectionFS supports functions ```.allow```, ```.deny```, ```.find```, ```findOne``` used when subscribing/ publishing from server* 
*It's here you can add restrictions eg. on content-types, filesizes etc.*

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
*ContactsFS.storeFile(f) returns fileId or null, actual downloads are spawned as threads. It's possible to add metadata: ```storeFile(file, {})``` - callback or eventlisteners are on the todo*

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
*In future there would be made an alias for ```.find``` eg. ```ContactsFS.find({});```*
##Current being developed

####Issue 4: ```Create a server cache/ url reference```
Create a server cache for completed files in the public/collectionFS._name folder.
Update fs.files record attribute: fileURL[]

Prepare abillity for special versin caching options creating converting images, docs, tts, sound, video, remote server upload etc.
Further details in server/collectionFS.server.js
```js
CollectionFS.fileHandlers({
  //Default image cache
  handler['']: function(fileId, blob) { //Can it be empty ['']? default cache file
    return blob; //just send blob directly to the filesystem
  },
  //Some specific
  handler['40x40']: function(fileId, blob) {
     //Some serverside image/file handling functions, user can define this
     return blob;
   },
  //Upload to remote server
  handler['remote']: function(fileId, blob) {
     //Some serverside upload to remote server, dont return blob to filesystem
     return null;
   }
 });
```
*Need to figure out how to prevent Meteor to reload when uploading to the public folder*

###Future:
* Handlebar helpers? ```{{fileProgress}}```, ```{{fileInQue}}```, ```{{fileAsURL}}```, ```{{fileURL _id}}``` etc.
* Maybe in time have the option to serve files directly from Meteor via url ```{{fileAsURL}}```- leaving caching to the server and browser?
* Server side handling image size etc. not supported, but would be a must have if to be used in realworld apps
* It doesn't use gridFS, but could be compatible with gridFS and other databases in time
* Only one can upload at the moment, but really multiple instances and users could be supported ```(TODO in code)```
* When code hot deploy the que halts, not sure how to address this, maybe a listener on connection status?
* Deviates from gridFS by using chunkSize = 1024 (gridFS = 256?) - less transport bagage
* Deviates from gridFS by using files.len istead of files.length (as in gridFS, using .length creates error in Meteor?)
* Speed, it sends data via Meteor.apply, this lags big time, therefore multiple workers are spawned to compensate
* Current version is set to autosubscribe, this needs to be addressed in future

###Notes:
* This is made as ```Make it work, make it fast```, well it's not fast - yet
* No test suite - any good ones for Meteor?
* No smart packages - dont know how, yet
* Current code contains relics in form of logs and timers used in the example ```statistics``` and for debuggin
* I'm new to node.js, Meteor and github - this is my first code ever in Meteor

###Decisions:
* Initially I thought about using localStorage, but the limited size in the sandbox didn't make sense
* Really wanted to make the Meteor serve files directly via url handling, getting the benefit of server+browser caching
* Deviating the gridFS spec to make the code work and faster