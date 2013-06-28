if (typeof Handlebars !== 'undefined') {
    //Usage:
    //{{cfsFile "Collection" fileId}}
    Handlebars.registerHelper('cfsFile', function(collection, fileId) {
        return window[collection].findOne(fileId);
    });

    //Usage:
    //{{cfsFiles "Collection"}}
    Handlebars.registerHelper('cfsFiles', function(collection) {
        return window[collection].find();
    });

    //Usage:
    //{{#if cfsHasFiles "Collection"}}
    Handlebars.registerHelper('cfsHasFiles', function(collection) {
        return window[collection].find().count() > 0;
    });

    //Usage:
    //(1) {{isUploading "Collection"}} (with file as current context)
    //(2) {{isUploading "Collection" file=file}}
    //(3) {{isUploading "Collection" fileId=fileId}}
    Handlebars.registerHelper('isUploading', function(collection, opts) {
        var fileId, hash, CFS;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.isUploading(fileId);
    });

    //Usage:
    //(1) {{isDownloading "Collection"}} (with file as current context)
    //(2) {{isDownloading "Collection" file=file}}
    //(3) {{isDownloading "Collection" fileId=fileId}}
    Handlebars.registerHelper('isDownloading', function(collection, opts) {
        var fileId, hash, CFS;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.isDownloading(fileId);
    });

    //Usage:
    //(1) {{isDownloaded "Collection"}} (with file as current context)
    //(2) {{isDownloaded "Collection" file=file}}
    //(3) {{isDownloaded "Collection" fileId=fileId}}
    Handlebars.registerHelper('isDownloaded', function(collection, opts) {
        var fileId, hash, CFS;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.isDownloaded(fileId);
    });

    //Usage:
    //(1) {{isComplete "Collection"}} (with file as current context)
    //(2) {{isComplete "Collection" file=file}}
    //(3) {{isComplete "Collection" fileId=fileId}}
    Handlebars.registerHelper('isComplete', function(collection, opts) {
        var fileId, hash, CFS;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.isComplete(fileId);
    });

    //Usage:
    //(1) {{cfsQueueProgress "Collection"}} (with file as current context)
    //(2) {{cfsQueueProgress "Collection" file=file}}
    //(3) {{cfsQueueProgress "Collection" fileId=fileId}}
    Handlebars.registerHelper('cfsQueueProgress', function(collection, opts) {
        var fileId, hash, CFS;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.progress(fileId);
    });

    //Usage:
    //(1) {{cfsQueueProgressBar "Collection"}} (with file as current context)
    //(2) {{cfsQueueProgressBar "Collection" file=file}}
    //(3) {{cfsQueueProgressBar "Collection" fileId=fileId}}
    //Supported Options: id, class
    Handlebars.registerHelper('cfsQueueProgressBar', function(collection, opts) {
        var fileId, hash;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        return new Handlebars.SafeString(Template._cfsQueueProgressBar({
            collection: collection,
            fileId: fileId,
            attributes: (hash.id ? ' id="' + hash.id + '"' : '') + (hash.class ? ' class="' + hash.class + '"' : '')
        }));
    });

    //Usage:
    //{{isPaused "Collection"}}
    Handlebars.registerHelper('isPaused', function(collection) {
        var CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.isPaused();
    });

    //Usage (Is current user the owner?):
    //(1) {{isOwner}} (with file as current context)
    //(2) {{isOwner file=file}}
    //(3) {{isOwner fileId=fileId collection="Collection"}}
    //Usage (Is user with userId the owner?):
    //(1) {{isOwner userId=userId}} (with file as current context)
    //(2) {{isOwner file=file userId=userId}}
    //(3) {{isOwner fileId=fileId collection="Collection" userId=userId}}
    Handlebars.registerHelper('isOwner', function(opts) {
        var file, hash, userId;
        hash = opts && opts.hash ? opts.hash : {};
        userId = hash.userId || Meteor.userId();
        if (hash.fileId && hash.collection) {
            file = window[hash.collection].findOne(hash.fileId);
        }
        if (!file) {
            file = hash.file || this;
        }
        if (!file) {
            return false;
        }
        return (file.owner === userId);
    });

    //Usage (default format string):
    //(1) {{formattedSize}} (with file as current context)
    //(2) {{formattedSize file=file}}
    //(3) {{formattedSize fileId=fileId collection="Collection"}}
    //Usage (any format string supported by numeral.format):
    //(1) {{formattedSize formatString=formatString}} (with file as current context)
    //(2) {{formattedSize file=file formatString=formatString}}
    //(3) {{formattedSize fileId=fileId collection="Collection" formatString=formatString}}
    Handlebars.registerHelper('formattedSize', function(opts) {
        var file, hash, formatString;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.fileId && hash.collection) {
            file = window[hash.collection].findOne(hash.fileId);
        }
        if (!file) {
            file = hash.file || this;
        }
        if (!file) {
            return "Unknown";
        }
        formatString = hash.formatString || '0.00 b';
        return numeral(file.length).format(formatString);
    });

    //Usage:
    //(1) {{fileHandlers}} (with file as current context)
    //(2) {{fileHandlers file=file}}
    //(3) {{fileHandlers fileId=fileId collection="Collection"}}
    Handlebars.registerHelper('fileHandlers', function(opts) {
        var file, hash, fh, fId, fileHandlers = [];
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.fileId && hash.collection) {
            file = window[hash.collection].findOne(hash.fileId);
        }
        if (!file) {
            file = hash.file || this;
        }
        if (!file || !file.fileHandler) {
            return fileHandlers;
        }
        for (fId in file.fileHandler) {
            fileHandlers.push(fId);
        }
        return fileHandlers;
    });

    //Usage:
    //(1) {{fileUrl "defaultHandler"}} (with file as current context)
    //(2) {{fileUrl "defaultHandler" file=file}}
    //(3) {{fileUrl "defaultHandler" fileId=fileId collection="Collection"}}
    Handlebars.registerHelper('fileUrl', function(fileHandler, opts) {
        var file, hash, fh;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.fileId && hash.collection) {
            file = window[hash.collection].findOne(hash.fileId);
        }
        if (!file) {
            file = hash.file || this;
        }
        if (!file || !file.fileHandler) {
            return "";
        }
        fh = file.fileHandler[fileHandler];
        if (!fh) {
            return "";
        }
        return fh.url;
    });

    //Usage:
    //(1) {{cfsDownloadButton "Collection"}} (with file as current context)
    //(2) {{cfsDownloadButton "Collection" file=file}}
    //(3) {{cfsDownloadButton "Collection" fileId=fileId}}
    //Supported Options: id, class, content
    Handlebars.registerHelper('cfsDownloadButton', function(collection, opts) {
        var fileId, hash, atts;
        hash = opts && opts.hash ? opts.hash : {};
        if (hash.file) {
            fileId = hash.file._id;
        } else {
            fileId = hash.fileId || this._id;
        }
        if (!fileId) {
            return false;
        }
        hash.class = hash.class ? hash.class + ' cfsDownloadButton' : 'cfsDownloadButton';
        atts = (hash.id ? ' id="' + hash.id + '"' : '') + (hash.class ? ' class="' + hash.class + '"' : '');
        return new Handlebars.SafeString(Template._cfsDownloadButton({
            collection: collection,
            fileId: fileId,
            content: hash.content,
            attributes: atts
        }));
    });

    Template._cfsDownloadButton.events({
        'click .cfsDownloadButton': function(event, template) {
            var fileId = template.data.fileId,
                    collection = template.data.collection, CFS;
            if (!fileId || !collection) {
                return false;
            }
            CFS = window[collection];
            if (!CFS || !CFS.queue) {
                return false;
            }
            CFS.retrieveBlob(fileId, function(fileItem) {
                if (fileItem.blob) {
                    window.saveAs(fileItem.blob, fileItem.filename);
                } else {
                    window.saveAs(fileItem.file, fileItem.filename);
                }
            });
        }
    });

    //TODO make this work and test thoroughly
    Template._cfsFileInput.events({
        'change .cfsFileInput': function(event, template) {
            var elem = event.target,
                files = elem.files,
                storeIdsFor = template.data.storeIdsFor,
                path = template.data.storeIdsIn,
                collection = template.data.collection,
                multiple = template.data.multiple,
                set = {},
                collectionName, indexOfFirstDot;
            if (files) {
                var ids = window[collection].storeFiles(files);
                if (path && path.length) {
                    indexOfFirstDot = path.indexOf('.');
                    if (indexOfFirstDot === -1) {
                        return;
                    }
                    collectionName = path.slice(0, indexOfFirstDot);
                    path = path.slice(indexOfFirstDot + 1);

                    if (multiple) {
                        setObjByString(set, path, ids);
                    } else {
                        if (ids.length) {
                            setObjByString(set, path, ids[0]);
                        } else {
                            setObjByString(set, path, null);
                        }
                    }
                    window[collectionName].update(storeIdsFor, {$set: set});
                }
            }
        }
    });

    //Usage: (TODO)
    Handlebars.registerHelper('cfsFileInput', function(collection, options) {
        var html, hash = options.hash, styles, atts;
        switch (hash.type) {
            case "file":
                hash.class = hash.class ? hash.class + ' cfsFileInput' : 'cfsFileInput';
                atts = (hash.id ? ' id="' + hash.id + '"' : '') + (hash.class ? ' class="' + hash.class + '"' : '') + (hash.name ? ' name="' + hash.name + '"' : '') + (hash.multiple ? ' multiple' : '');
                html = Template._cfsDownloadButton({
                    collection: collection,
                    multiple: hash.multiple,
                    storeIdsIn: hash.storeIdsIn,
                    storeIdsFor: hash.storeIdsFor,
                    attributes: atts
                });
                break;
            case "image":
                //TODO
                break;
        }
        return new Handlebars.SafeString(html);
    });
}