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
Songs.fileFilter({
    allow: {
        contentTypes: ['audio/*']
    }
});

Images.fileFilter({
    allow: {
        contentTypes: ['image/*']
    }
});

if (Meteor.isClient) {
    //data subscriptions
    Meteor.subscribe("songs");
    Meteor.subscribe("images");

    var imgAddCallback = function(file, fileId) {
        var img = document.createElement("img");
        $(img).addClass("imgItem").attr("data-cfs-collection", "Images").attr("data-cfs-id", fileId);
        $('div.imgList').append(img);
        $(img).hide();
        var fileReader = new FileReader();
        fileReader.onload = function(oFREvent) {
            $(img).attr("src", oFREvent.target.result).show();
        };
        fileReader.readAsDataURL(file);
    };

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
        }
    });

    var imgFilter = /^(?:image\/bmp|image\/cis\-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x\-cmu\-raster|image\/x\-cmx|image\/x\-icon|image\/x\-portable\-anymap|image\/x\-portable\-bitmap|image\/x\-portable\-graymap|image\/x\-portable\-pixmap|image\/x\-rgb|image\/x\-xbitmap|image\/x\-xpixmap|image\/x\-xwindowdump)$/i;
    Handlebars.registerHelper('fileImage', function(opts) {
        var file, hash;
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
        console.log(file);
        if (!file || !imgFilter.test(file.contentType)) {
            return "No image file";
        }
        window[hash.collection].retrieveBlob(file._id, function(fileItem) {
            if (fileItem.blob) {
                var fileReader = new FileReader();
                fileReader.onload = function(oFREvent) {
                    var elem = $("img[data-cfs-collection=" + hash.collection + "]").filter('[data-cfs-id=' + file._id + ']');
                    elem.attr("src", oFREvent.target.result);
                    elem.css("display", "");
                };
                fileReader.readAsDataURL(fileItem.blob);
            }
        });
        return new Handlebars.SafeString('<img src="" data-cfs-collection="' + hash.collection + '" data-cfs-id="' + file._id + '" style="display: none;" class="' + (hash.class || '') + '" />');
    });

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
            Images.storeFiles(files, imgAddCallback);
            Session.set("visibleDialog", null);
        }
    });

    //download/delete buttons
    Template.song.events({
        'click .download': function(e) {
            e.preventDefault();
            var file = this;
            Songs.retrieveBlob(file._id, function(fileItem) {
                if (fileItem.blob) {
                    window.saveAs(fileItem.blob, file.filename);
                }
            });
        },
        'click .delete': function(e) {
            e.preventDefault();
            Songs.remove(this._id);
        }
    });
    Template.image.events({
        'click .download': function(e) {
            e.preventDefault();
            var file = this;
            Images.retrieveBlob(file._id, function(fileItem) {
                if (fileItem.blob) {
                    window.saveAs(fileItem.blob, file.filename);
                }
            });
        },
        'click .delete': function(e) {
            e.preventDefault();
            Images.remove(this._id);
        }
    });

    //generic dialog close event
    $(document).on('click', 'button.cancel', function(e) {
        e.preventDefault();
        Session.set("visibleDialog", null);
    });

    Meteor.startup(function() {
        var elem = $(".imgList").get(0);
        Images.acceptDropsOn([elem], imgAddCallback);

        elem = $(".audioList").get(0);
        Songs.acceptDropsOn([elem]);
    });
}

if (Meteor.isServer) {
    Meteor.publish("songs", function() {
        return Songs.find({owner: this.userId}, {$sort: {uploadDate: -1}});
    });
    Meteor.publish("images", function() {
        return Images.find({owner: this.userId}, {$sort: {uploadDate: -1}});
    });

    Meteor.startup(function() {
        // code to run on server at startup


    });
}
