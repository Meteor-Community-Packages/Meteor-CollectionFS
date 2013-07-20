Cases = new Meteor.Collection("cases");
UserData = new Meteor.Collection("userData");
Filesystem = new CollectionFS("filesystem", { autopublish: false });

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

if (Meteor.isClient) {
    // Use session for setting filter options
    Session.setDefault('filter', { completed: '', reversed: true, owner: true, sortBy: 'filename', limit: 5 });

	// Make subscription depend on the current filter
	Deps.autorun(function() {
      var filter = Session.get('filter');
      Meteor.subscribe('listFilesystem', filter);
    });
}

if (Meteor.isServer) {
    // example #1 - manually publish with an optional param
    Meteor.publish('listFilesystem', function(filter) {
    	var filterQuery = {};
    	var filterOptions = {};

    	if ( filter.completed === true || filter.completed === false)
    		filterQuery.complete = filter.completed;

    	if ( filter.owner === true )
    		filterQuery.owner = this.userId;

    	if ( filter.sortBy && filter.sortBy == ''+filter.sortBy && filter.sortBy != '') {
    		var query = {};
    		query[filter.sortBy] = (filter.reversed)? 1 : -1;
    		filterOptions.sort = query;
    	}

    	if ( filter.limit && +filter.limit == +filter.limit )
    		filterOptions.limit = +filter.limit;

      // sort by handedAt time and only return the filename, handledAt and _id fields
      return Filesystem.find( filterQuery, filterOptions );

    }); // EO Publish

  Filesystem.fileHandlers({
  	default1: function(options) { //Options contains blob and fileRecord - same is expected in return if should be saved on filesytem, can be modified
  		serverConsole.log('I am handling 1: '+options.fileRecord.filename);
  		//console.log(options.destination().serverFilename);
  		//console.log(options.destination('tst').fileData.url);
  		return { blob: options.blob, fileRecord: options.fileRecord }; //if no blob then save result in fileURL (added createdAt)
  	},
  	default2: function(options) {
  		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg') //Save som space, only make cache if less than 1Mb
  			return null; //Not an error as if returning false, false would be tried again later...
  		serverConsole.log('I am handling 2: '+options.fileRecord.filename);
  		return { blob: options.blob, fileRecord: options.fileRecord };
  	},
  	default3: function(options) {
  		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
  			return null;
  		serverConsole.log('I am handling 3: '+options.fileRecord.filename);
  		return { blob: options.blob, fileRecord: options.fileRecord };
  	},
  	default4: function(options) {
  		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
  			return null;
  		serverConsole.log('I am handling 4: '+options.fileRecord.filename);
  		return { blob: options.blob, fileRecord: options.fileRecord };
  	},
  	default5: function(options) {
  		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
  			return null;
  		serverConsole.log('I am handling 5: '+options.fileRecord.filename);
  		return { blob: options.blob, fileRecord: options.fileRecord };
  	},
  	size40x40: function(options) {
  		return null;
  		/*var im = Npm.require('imagemagick');
  		im.resize({
                  srcData: options.blob,
                  width: 40
             });*/
  		serverConsole.log('I am handling: '+options.fileRecord.filename+' to...');
  		return { extension: 'bmp', blob: options.blob, fileRecord: options.fileRecord }; //or just 'options'...
  	}/*,
  	defaultFailing4: function(options) {
  		if (options.fileRecord.length > 5000000 || options.fileRecord.contentType != 'image/jpeg')
  			return null;
  		serverConsole.log('I am handling Fail: '+options.fileRecord.filename+' but failing');
  		return false;
  	}*/
  });
} // EO isServer
