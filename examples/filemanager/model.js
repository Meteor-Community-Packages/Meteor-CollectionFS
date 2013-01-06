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
  remove: function(userId, files) { return false; }
});