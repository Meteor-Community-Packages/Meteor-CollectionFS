  
	Meteor.publish("users", function () {
  	return Meteor.users.find({}, {fields: {emails: true, username:true, profile: true, services: true}});
	});


	// Rerun filehanders on all files - this is just for testing!
	Meteor.methods({
		'resetFilehandlers': function() {
			Filesystem.find({}).forEach(function(doc) {
				Filesystem.update({ _id: doc._id}, { $set: { handledAt: null, fileHandler: {} }  });
			});
		},
        'createServerFile': function() {
            // Test storeBuffer
            var myText = 'Hello world from the server, I wrote this.. :)';
            var buffer = Buffer(myText.length);

            for (var i = 0; i < myText.length; i++)
                buffer[i] = myText.charCodeAt(i);


            Filesystem.storeBuffer('My server uploaded file.txt', buffer, { 
                contentType: 'text/plain',          // Set a contentType (optional)
                owner: this.userId                  // Set a user id (optional)
                //noProgress: true,                 // Stop live update of progress (optional default to false)
                //metadata: { text: 'some stuff' }  // Attach custom data to the file
            });
        }
	});


  Meteor.startup(function () {
    // code to run on server at startup
    console.log("----== Gi-collectionFS ==----");
    //Filesystem.remove({});
  }); 