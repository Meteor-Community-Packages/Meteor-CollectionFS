//wrap gm() object with an object that exposes the same methods, with the addition of a
//.save() method that overwrites the FileObject's .buffer with the result

//TODO make sure this all works

var path = Npm.require('path');
var Future = Npm.require(path.join('fibers', 'future'));
var gm = Npm.require('gm');

if (typeof FileObject !== "undefined") {

  FileObject.prototype.gm = function() {
    var self = this;
    var subGM = gm.subClass({fileObject: self});
    return subGM(self.buffer, self.filename);
  };
  
  gm.prototype.save = function() {
    var self = this;
    var fut = new Future();
    
    var callback = Meteor.bindEnvironment(function(err, buffer) {
      if (err)
        throw err;
      self._options.fileObject.loadBuffer(buffer);
      fut.return(self);
    }, function (err) {
      throw err;
    });
    this.toBuffer(callback);
    
    return fut.wait();
  };
}