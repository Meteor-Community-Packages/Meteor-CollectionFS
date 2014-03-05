Meteor.methods({
  '_cfs_downloadAndAddFile': function (url, name) {
    var collection = FS._collections[name];
    
    if (!collection)
      throw new Error("No FS.Collection has the name " + name);
    
    this.unblock();
    
    return collection.insert(url);
  }
});