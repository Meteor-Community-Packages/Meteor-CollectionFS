
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
}

Template.queControl.events({
  'change .fileUploader': function (e) {
    var files = e.target.files;
    for (var i = 0, f; f = files[i]; i++) {
      Filesystem.storeFile(f);
    }
  },
  'click .btnPause': function(e) {
    Filesystem.que.pause();
  },
  'click .btnResume': function(e) {
    Filesystem.que.resume();
  },
  'click .btnToggleStats': function(e) {
    var t = (Session.get('statToggleStats'))?false:true;
    Session.set('statToggleStats', t);
  }
});

Template.queControl.helpers({
  isPaused: function() {
    return Filesystem.que.isPaused();
  }
});

Template.fileTable.events({
  'change .btnResumeFile': function(e) {
    var files = e.target.files;
    var fileMatched = false;
    /*for (var i = 0, f; f = files[i]; i++) {
      fileMatched = Filesystem.que.resumeFile(this, f);
    } //EO for*/
    fileMatched = Filesystem.que.resumeFile(this, files[0]);
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
  } //EO saveAs
});

Template.fileTable.helpers({
  Files: function() {
    return Filesystem.files.find({}, { sort: { uploadDate:-1 } });
  },
  isPaused: function() {
    return Filesystem.que.isPaused();
  },
  progress : function() {
    var filesProgress = Math.round(this.currentChunk / (this.countChunks - 1) * 100);
    var queProgress = Filesystem.que.progress(this._id);
    var responsiveProgress = Math.max(filesProgress, queProgress); 
    var fileInQue = Filesystem.que.getItem(this._id);
    
    if (this.complete && !this.download) {
    //downloaded og i kø grøn
      if (fileInQue) {
        if (Filesystem.que.isPaused()) {
          if (queProgress == 100) {
            return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: queProgress, progressB: 100-queProgress};
          } else { 
            return { barAStyle: 'bar-warning', barBStyle:'progress-info', progressA: queProgress, progressB: 100-queProgress};
          }
        } else {
          return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: queProgress, progressB: 100-queProgress};
        }
      } else {
        return { barAStyle: 'progress-info', barBStyle:'bar-success', progressA: '100', progressB: '0'};
        //downloaded blå
      }
    } else {
      if (fileInQue) {
        if (Filesystem.que.isPaused()) {
          //upload pause gul rød
          if (this.download) {
            if (queProgress == 100) {
              return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            } else { 
              return { barAStyle: 'bar-warning', barBStyle:'bar-danger', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            }
          } else {
            return { barAStyle: 'bar-warning', barBStyle:'bar-danger', progressA: queProgress, progressB: 100-queProgress};
          }
          //download pause gul, blå
        } else {
          //upload igang grøn gul
          if (this.download) {
            if (queProgress == 100) {
              return { barAStyle: 'bar-success', barBStyle:'progress-info', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            } else {
              return { barAStyle: 'bar-warning', barBStyle:'progress-info', progressA: responsiveProgress, progressB: 100-responsiveProgress};
            }
          } else {
            return { barAStyle: 'bar-success', barBStyle:'bar-warning', progressA: filesProgress, progressB: 100-filesProgress}; //que - 
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
    var cGb = Math.floor(this.len / 1000000000);
    if (cGb > 0) return (Math.floor(this.len / 10000000)/100) + 'Gb';
    var cMb = Math.floor(this.len / 1000000);
    if (cMb > 0) return (Math.floor(this.len / 10000)/100) + 'Mb';
    var cKb = Math.floor(this.len / 1000);
    if (cKb > 0) return (Math.floor(this.len / 10)/100) + 'Kb';
    return this.len + 'bytes';
  },
  transfereText: function() {
    if (!this.complete) {
      //check if file pointer found in que
      if (Filesystem.que.getItem(this._id)) {
        //In progress
        if (Filesystem.que.isPaused())
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
      //check if file pointer found in que
      if (Filesystem.que.getItem(this._id)) {
        //In progress
      if (Filesystem.que.isPaused()) {
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
    //Not complete, not in que?
    return ( !this.complete && !Filesystem.que.getItem(this._id));
  }, //EO resume
  ownerUsername : function () {
    //lookup
    return extractProfile(this.owner).username; 
  },
  isDownloading: function() { 
    return Filesystem.que.isDownloading(this._id);
  }
});

Template.stats.helpers({
  statistics: function() {
    return {
      uploadTotal: Filesystem.que.getTimer('upload', 'total'),
      uploadFileReader: Filesystem.que.getTimer('upload', 'filereader'),
      uploadMeteorCall: Filesystem.que.getTimer('upload', 'meteorcall'),
      uploadMeteorCallServer: Filesystem.que.getTimer('upload', 'meteorcallserver'),
      downloadTotal: Filesystem.que.getTimer('download', 'total'),
      downloadFileReader: Filesystem.que.getTimer('download', 'filereader'),
      downloadMeteorCall: Filesystem.que.getTimer('download', 'meteorcall'),
      downloadMeteorCallServer: Filesystem.que.getTimer('download', 'meteorcallserver'),
      timeQueLength: Filesystem.que.getTimeQueLength(),
      bitPrSecDownload: (Session.get("bitPrSecDownload"))?Math.round(Session.get("bitPrSecDownload")/1000):0,
      bitPrSecUpload: (Session.get("bitPrSecUpload"))?Math.round(Session.get("bitPrSecUpload")/1000):0
    };
  },
  statToggleStats: function() { return Session.get('statToggleStats'); }  
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
