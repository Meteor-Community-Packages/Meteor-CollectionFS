Cases = new Meteor.Collection("cases");
UserData = new Meteor.Collection("userData");
Filesystem = new collectionFS("filesystem");

Filesystem.files.allow({
  insert: function(userId, myFile) { return userId && myFile.owner === userId; },
  update: function(userId, files, fields, modifier) {
        return _.all(files, function (myFile) {
      if (userId !== myFile.owner)
        return false; //not owner
      var allowed = ["complete", "currentChunk", "countChunks", "md5", "metadata"];
      if (_.difference(fields, allowed).length)
        return false; //invalid 

      return true;
    });  //EO interate through cases
  },
  remove: function(userId, files) { return false; }
});

Cases.allow({
  insert: function (userId, myCase) {
    return userId && myCase.owner === userId;
  }, //EO insert
  update: function (userId, cases, fields, modifier) {
    return _.all(cases, function (myCase) {
      if (userId !== myCase.owner)
        return false; //not owner
      var allowed = ["name"];
      if (_.difference(fields, allowed).length)
        return false; //invalid 

      return true;
    });  //EO interate through cases
  }, //EO update
  remove: function (userId, cases) {
    return false; //nobody can delete
  } //EO Remove

}); //EO allow


//@Param userObjId - expects either user object or id
//
//Returns a basic user information object:
// ._id - the Meteor.users id
// .id  - service id
// .accessToken - service access token
// .serviceName - name of service eg. facebook, google etc.
// .email       - user email, not to be expected from twitter service
// .username    - profile username
// .twitterUsername - twitters @username
// 
// tested with facebook, twitter, google, password
// TODO: add picture / profile photo

var _extractProfile = function (userObjId) {

    //Check if an _id isset otherwise assume input as being _id
    var user = (userObjId._id)?userObjId: Meteor.users.findOne({_id: userObjId});
  if (user) {
    //setup default object from user profile
    var result = {
      _id: (user._id)?(user._id):null, //if null then really no point in going on
      id: null,
      accessToken: null,
      serviceName: 'password', //default service
      email: (user.emails && user.emails.length)?user.emails[0].address:null, //a bit off, should be placed in service->password->email?
      username: (user.username)?user.username:null,
      twitterUsername: null, //@username - kinda off that twitter dont do email
    };
    result.username = (user.profile && user.profile.name)?user.profile.name:result.username;

    //Check if the user logged in via a service
    if (user.services) {
      //Iterate through services
      for (var serviceName in user.services) {
        var serviceObject = user.services[serviceName];
        //If an 'id' isset then assume valid service
        if (serviceObject.id) {
          //Merge result with service info
          result.id = serviceObject.id;
          result.email = (serviceObject.email) ? serviceObject.email : result.email;
          result.serviceName = serviceName;
          result.accessToken = (serviceObject.accessToken) ? serviceObject.accessToken : null;
          result.twitterUsername = (serviceObject.screenName) ? serviceObject.screenName : null;
        } //EO serviceObject.id
      }  //EO for
    } //EO user.services
    return result;
  } else {
    console.log('user id or user object not found: '+userObjId);
    return null;
  }  
}; //EO extractProfile