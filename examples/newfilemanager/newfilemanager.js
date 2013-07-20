Songs = new CollectionFS("songs", {autopublish: false});
Images = new CollectionFS("images", {autopublish: false});

//security
var allowRules = {
    insert: function(userId, file) {
        return userId && file.owner === userId;
    },
    update: function(userId, file, fields, modifier) {
        return userId && file.owner === userId;
    },
    remove: function(userId, file) {
        return userId && file.owner === userId;
    }
};
Songs.allow(allowRules);
Images.allow(allowRules);

//filters
Songs.filter({
    allow: {
        contentTypes: ['audio/*']
    },
    maxSize: 5242880 //5MB
});

Images.filter({
    allow: {
        contentTypes: ['image/*']
    },
    maxSize: 1048576 //1MB
});

if (Meteor.isClient) {
    var imgSelectionDep = new Deps.Dependency();

    Accounts.ui.config({
        passwordSignupFields: 'USERNAME_ONLY'
    });

    //data subscriptions
    Meteor.subscribe("songs");
    Meteor.subscribe("images");

    Images.acceptDropsOn("imgListArea", ".imgList");
    Songs.acceptDropsOn("audioListArea", ".audioList");

    //events
    Template.audioListArea.events({
        'click #addAudio': function(e) {
            e.preventDefault();
            Session.set("visibleDialog", "song.add");
        }
    });

    Template.imgListArea.events({
        'click #addImage': function(e) {
            e.preventDefault();
            Session.set("visibleDialog", "img.add");
        },
        'click #deleteImages': function(e) {
            e.preventDefault();
            $('.imgItem.selected').fadeOut(600, function() {
                var fileId = $(this).attr("data-cfs-id");
                Images.remove(fileId);
                imgSelectionDep.changed();
            });
        }
    });

    var onInvalid = function(type, fileRecord) {
        if (type === CFSErrorType.disallowedContentType || type === CFSErrorType.disallowedExtension) {
            $.gritter.add({
                title: 'Wrong File Type',
                text: "Sorry, " + fileRecord.filename + " is not the type of file we're looking for."
            });
        } else if (type === CFSErrorType.maxFileSizeExceeded) {
            $.gritter.add({
                title: 'Too Big',
                text: "Sorry, " + fileRecord.filename + " is too big to upload."
            });
        }
    };
    Songs.events({
       'invalid': onInvalid
    });
    Images.events({
       'invalid': onInvalid
    });

    var dataUrlCache = {};
    Template.image.fileImage = function(opts) {
      console.log(this);
        var file, hash, src = "", style = "";
        hash = opts && opts.hash ? opts.hash : {};
        if (!hash.collection) {
            return "";
        }
        if (hash.fileId && hash.collection) {
            file = window[hash.collection].findOne(hash.fileId);
        }
        if (!file) {
            file = hash.file || this;
        }
        if (!file) {
            return "";
        }
        if (dataUrlCache[file._id + "_" + file.length]) {
            //we've already generated the URL, so just use it
            src = dataUrlCache[file._id + "_" + file.length];
        } else {
            style = "display: none";
            window[hash.collection].retrieveBlob(file._id, function(fileItem) {
                if (fileItem.blob || fileItem.file) {
                    var fileReader = new FileReader();
                    fileReader.onload = function(oFREvent) {
                        if (!dataUrlCache[file._id + "_" + file.length]) {
                            dataUrlCache[file._id + "_" + file.length] = oFREvent.target.result;
                        }
                        var elem = $("img[data-cfs-collection=" + hash.collection + "]").filter('[data-cfs-id=' + file._id + ']');
                        elem.attr("src", oFREvent.target.result);
                        elem.css("display", "");
                    };
                    fileReader.readAsDataURL(fileItem.blob || fileItem.file);
                }
            });
        }

        return {src: src, collection: hash.collection, id: file._id, style: style, class: (hash.class || '') };
    };

    Template.image.events({
        'click .imgItem': function(event) {
            $(event.currentTarget).toggleClass("selected");
            this.selected = $(event.currentTarget).hasClass("selected");
            imgSelectionDep.changed();
        }
    });

    Template.imgListArea.deleteImagesButtonDisabled = function () {
        imgSelectionDep.depend();
        return $(".imgItem.selected").length ? "" : " disabled";
    };

    //upload buttons
    Template.dialogAddSong.events({
        'click .save': function(e, template) {
            e.preventDefault();
            var files = template.find('input.fileSelect').files;
            Songs.storeFiles(files);
            Session.set("visibleDialog", null);
        }
    });
    Template.dialogAddImg.events({
        'click .save': function(e, template) {
            e.preventDefault();
            var files = template.find('input.fileSelect').files;
            Images.storeFiles(files);
            Session.set("visibleDialog", null);
        }
    });

    //delete buttons
    Template.song.events({
        'click .delete': function(e) {
            e.preventDefault();
            Songs.remove(this._id);
        }
    });

    //generic dialog close event
    $(document).on('click', 'button.cancel', function(e) {
        e.preventDefault();
        Session.set("visibleDialog", null);
    });
}

if (Meteor.isServer) {
    Accounts.config({
        sendVerificationEmail: false
    });

    Meteor.publish("songs", function() {
        return Songs.find({owner: this.userId}, {$sort: {uploadDate: -1}});
    });
    Meteor.publish("images", function() {
        return Images.find({owner: this.userId}, {$sort: {uploadDate: -1}});
    });
}
