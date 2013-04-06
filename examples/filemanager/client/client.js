
Meteor.subscribe("users");

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_EMAIL'
});

if (typeof Handlebars !== 'undefined') {
  Handlebars.registerHelper('getUsername', function (userId) {
    var user = _extractProfile(userId);
    if (user) {
      if (user.username)
        return user.username;
      if (user.twitterUsername)
        return user.twitterUsername;
    }
    return '';
  });
  Handlebars.registerHelper('getSession', function (key) {
    return Session.get(key);
  });
}

Template.queueControl.events({
  'change .fileUploader': function (e) {
    var files = e.target.files;
    for (var i = 0, f; f = files[i]; i++) {
      Filesystem.storeFile(f);
    }
  },
  'click .btnPause': function(e) {
    Filesystem.queue.pause();
  },
  'click .btnResume': function(e) {
    Filesystem.queue.resume();
  }
});

Template.queueControl.helpers({
  isPaused: function() {
    return Filesystem.queue.isPaused();
  }
});

Template.fileTable.events({
  'change .btnResumeFile': function(e) {
    var files = e.target.files;
    var fileMatched = false;
    /*for (var i = 0, f; f = files[i]; i++) {
      fileMatched = Filesystem.queue.resumeFile(this, f);
    } //EO for*/
    fileMatched = Filesystem.queue.resumeFile(this, files[0]);
    if (!fileMatched) alert("No match found");
  }, //EO resume btn
  'click .btnFileSaveAs': function() {
    console.log("save");
    Filesystem.retrieveBlob(this._id, function(fileItem) {
      if (fileItem.blob)
        saveAs(fileItem.blob, fileItem.filename)
      else
        saveAs(fileItem.file, fileItem.filename);

      //alert('Blob landed...'+fileItem._id+' '+self._id);
    });
  }, //EO saveAs
  'click .btnFileDelete': function() {
    if (confirm('Are you sure you want to delete the file: \n"'+this.filename+'"?'))
      Filesystem.remove(this._id);
  },
  'click .showImage': function(e) {
    document.getElementById('previewImage').src = this.path;
    document.getElementById('myModalLabel').innerHTML = 'Created by fileHandler "'+this.func+'"';
    document.getElementById('description').innerHTML = 'Url: <a hre="'+this.path+'">'+this.path+'</a>';
  }
});

Template.fileTable.helpers({
  Files: function() {
    return Filesystem.find({}, { sort: { uploadDate:-1 } });
  },
  isPaused: function() {
    return Filesystem.queue.isPaused();
  },
  isOwner: function() {
    return (this.owner == Meteor.userId());
  },
  fileHandler: function(func) {
    if (!this.fileHandler)
      return func;
    for (var fId in this.fileHandler) {
      if (this.fileHandler[fId].func && this.fileHandler[fId].func == func)
        return this.fileHandler[fId].url;
    }
    return false;
  },
  progress : function() {
    var filesProgress = Math.round(this.currentChunk / (this.countChunks - 1) * 100);
    var queueProgress = Filesystem.queue.progress(this._id);
    var responsiveProgress = Math.max(filesProgress, queueProgress); 
    var fileInQue = Filesystem.queue.getItem(this._id);
    
    if (this.complete && !this.download) {
    //downloaded og i kø grøn
      if (fileInQue) {
        if (Filesystem.queue.isPaused()) {
          if (queueProgress == 100) {
            return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: 100, progressB: 0};
          } else { 
            return { barAStyle: 'bar-warning', barBStyle:'progress-info', progressA: queueProgress, progressB: 100-queueProgress};
          }
        } else {
          return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: queueProgress, progressB: 100-queueProgress};
        }
      } else {
        return { barAStyle: 'progress-info', barBStyle:'bar-success', progressA: '100', progressB: '0'};
        //downloaded blå
      }
    } else {
      if (fileInQue) {
        if (Filesystem.queue.isPaused()) {
          //upload pause gul rød
          if (this.download) {
            if (queueProgress == 100) {
              return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            } else { 
              return { barAStyle: 'bar-warning', barBStyle:'bar-danger', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            }
          } else {
            return { barAStyle: 'bar-warning', barBStyle:'bar-danger', progressA: queueProgress, progressB: 100-queueProgress};
          }
          //download pause gul, blå
        } else {
          //upload igang grøn gul
          if (this.download) {
            if (queueProgress == 100) {
              return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            } else {
              return { barAStyle: 'bar-warning', barBStyle:'progress-info', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            }
          } else {
            return { barAStyle: 'bar-success', barBStyle:'bar-warning', progressA: filesProgress, progressB: 100-filesProgress}; //queue - 
          }
          //download igang grøn, blå
        }
      } else {
        //upload afbrudt gul, rød
        return { barAStyle: 'bar-warning', barBStyle:'bar-danger', progressA: filesProgress, progressB: 100-filesProgress};
      }
    }

  },
  estTime : function() {
    var duration = (Date.now()-this.uploadDate);
    var estimate = ((duration / this.currentChunk * this.countChunks) + this.uploadDate);
    var myDate = new Date(duration);
    return myDate.getHours()+':'+myDate.getMinutes()+':'+myDate.getSeconds();
  },
  niceSize: function() {
    var fileSize = (this.length || this.len)
    var cGb = Math.floor(fileSize / 1000000000);
    if (cGb > 0) return (Math.floor(fileSize / 10000000)/100) + 'Gb';
    var cMb = Math.floor(fileSize / 1000000);
    if (cMb > 0) return (Math.floor(fileSize / 10000)/100) + 'Mb';
    var cKb = Math.floor(fileSize / 1000);
    if (cKb > 0) return (Math.floor(fileSize / 10)/100) + 'Kb';
    return fileSize + 'bytes';
  },
  transfereText: function() {
    if (!this.complete) {
      //check if file pointer found in queue
      if (Filesystem.queue.getItem(this._id)) {
        //In progress
        if (Filesystem.queue.isPaused())
          return 'Paused'
        else 
          return 'In progress';
      } else {
        //Failed
        //Want to resume? show button with event:
        return 'Resume';
      } //EO progress / failed
    } else {
      //All done
      return 'Done';
    } //EO complete
  }, //EO text
  transfereStyleBS: function() {
    if (!this.complete) {
      //check if file pointer found in queue
      if (Filesystem.queue.getItem(this._id)) {
        //In progress
      if (Filesystem.queue.isPaused()) {
        return 'label-warning'; 
      } else {
        return 'label-info'; 
      } //EO paused
      } else {
        //Failed
        //Want to resume? show button with event:
        return 'label-important';
      } //EO progress / failed
    } else {
      //All done
      return 'label-success';
    } //EO complete
  }, //EO styleBS
  needToResumeUpload: function() {
    //Not complete, not in queue?
    return ( !this.complete && !Filesystem.queue.getItem(this._id));
  }, //EO resume
  ownerUsername : function () {
    //lookup
    return extractProfile(this.owner).username; 
  },
  isDownloading: function() { 
    return Filesystem.queue.isDownloading(this._id);
  },
  filehanderSupported: function() {
    return __meteor_runtime_config__.FILEHANDLER_SUPPORTED;
  }
});

Template.supportInfo.helpers({
  filehandlerSupported: function() {
    return __meteor_runtime_config__.FILEHANDLER_SUPPORTED;
  },
  filehandlerSymlinks: function() {
    return Filesystem.filehandlerSupport.symlinks;
  },
  filehandlerFilewrites: function() {
    return Filesystem.filehandlerSupport.filewrites;
  },
  filehandlerBundle: function() {
    return __meteor_runtime_config__.FILEHANDLER_BUNDLE;
  }  
});

Template.connectionStatus.connection = function() {
  Meteor.status().waiting = (Meteor.status().status == 'waiting');
  return Meteor.status();
};

Template.mainMenu.events({
  'click .btnMainMenuDashboard' : function () {
    console.log("log: goto dashboard");
  }
});
