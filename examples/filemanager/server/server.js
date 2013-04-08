  
	Meteor.publish("users", function () {
  	return Meteor.users.find({}, {fields: {emails: true, username:true, profile: true, services: true}});
	});


	// Rerun filehanders on all files - this is just for testing!
	Meteor.methods({
		'resetFilehandlers': function() {
			Filesystem.find({}).forEach(function(doc) {
				Filesystem.update({ _id: doc._id}, { $set: { handledAt: null, fileHandler: {} }  });
			});
		}		
	});


  Meteor.startup(function () {
    // code to run on server at startup
    console.log("----== Gi-collectionFS ==----");

  }); 