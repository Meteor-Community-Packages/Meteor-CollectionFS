Cases = new Meteor.Collection("cases");
UserData = new Meteor.Collection("userData");
Filesystem = new CollectionFS("filesystem");

Filesystem.allow({
  insert: function(userId, myFile) { return userId && myFile.owner === userId; },
  update: function(userId, files, fields, modifier) {
	return _.all(files, function (myFile) {
	  return (userId == myFile.owner);

    });  //EO interate through files
  },
  remove: function(userId, file) { 
	return (userId == file.owner);
  }
});

if (Meteor.isServer) {
	// Rerun filehanders on all files - this is just for testing!
//	Filesystem.find({}).forEach(function(doc) {
//		Filesystem.update({ _id: doc._id}, { $set: { handledAt: null, fileURL: [] }});
//	});
}

Filesystem.fileHandlers({
	default1: function(options) { //Options contains blob and fileRecord - same is expected in return if should be saved on filesytem, can be modified
		myLog('I am handling 1: '+options.fileRecord.filename);
		myLog('option.destination() object:');
		myLog(options.destination());
		myLog('option.destination("tst"):');
		myLog(options.destination('tst'));
		return { blob: options.blob, fileRecord: options.fileRecord }; //if no blob then save result in fileURL (added createdAt)
	},
	default2: function(options) {
		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg') //Save som space, only make cache if less than 1Mb
			return null; //Not an error as if returning false, false would be tried again later...
		myLog('I am handling 2: '+options.fileRecord.filename);
		return { blob: options.blob, fileRecord: options.fileRecord }; 
	},
	default3: function(options) { 
		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
			return null;
		myLog('I am handling 3: '+options.fileRecord.filename);
		return { blob: options.blob, fileRecord: options.fileRecord }; 
	},
	default4: function(options) { 
		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
			return null;
		myLog('I am handling 4: '+options.fileRecord.filename);
		return { blob: options.blob, fileRecord: options.fileRecord }; 
	},
	default5: function(options) { 
		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
			return null;
		myLog('I am handling 5: '+options.fileRecord.filename);
		return { blob: options.blob, fileRecord: options.fileRecord }; 
	},
	size40x40: function(options) {
		return null;
		/*var im = __meteor_bootstrap__.require('imagemagick');
		im.resize({
                srcData: options.blob,
                width: 40
           });*/
		myLog('I am handling: '+options.fileRecord.filename+' to...');
		return { extension: 'bmp', blob: options.blob, fileRecord: options.fileRecord }; //or just 'options'...
	},
	defaultFailing4: function(options) { 
		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
			return null;
		myLog('I am handling Fail: '+options.fileRecord.filename+' but failing');
		return false; 
	}
});