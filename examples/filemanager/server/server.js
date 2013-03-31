  
	Meteor.publish("users", function () {
  	return Meteor.users.find({}, {fields: {emails: true, username:true, profile: true, services: true}});
	});

  Meteor.startup(function () {
    // code to run on server at startup

    console.log("----== Gi-collectionFS ==----");

  }); 