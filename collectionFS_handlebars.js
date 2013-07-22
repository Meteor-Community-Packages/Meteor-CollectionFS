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
    //(1) {{cfsIsUploading "Collection"}} (with file as current context)
    //(2) {{cfsIsUploading "Collection" file=file}}
    //(3) {{cfsIsUploading "Collection" fileId=fileId}}
    Handlebars.registerHelper('cfsIsUploading', function(collection, opts) {
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
    //(1) {{cfsIsDownloading "Collection"}} (with file as current context)
    //(2) {{cfsIsDownloading "Collection" file=file}}
    //(3) {{cfsIsDownloading "Collection" fileId=fileId}}
    Handlebars.registerHelper('cfsIsDownloading', function(collection, opts) {
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
    //(1) {{cfsIsDownloaded "Collection"}} (with file as current context)
    //(2) {{cfsIsDownloaded "Collection" file=file}}
    //(3) {{cfsIsDownloaded "Collection" fileId=fileId}}
    Handlebars.registerHelper('cfsIsDownloaded', function(collection, opts) {
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
    //(1) {{cfsIsComplete "Collection"}} (with file as current context)
    //(2) {{cfsIsComplete "Collection" file=file}}
    //(3) {{cfsIsComplete "Collection" fileId=fileId}}
    Handlebars.registerHelper('cfsIsComplete', function(collection, opts) {
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
    //{{cfsIsPaused "Collection"}}
    Handlebars.registerHelper('cfsIsPaused', function(collection) {
        var CFS = window[collection];
        if (!CFS || !CFS.queue) {
            return false;
        }
        return CFS.queue.isPaused();
    });

    //Usage (Is current user the owner?):
    //(1) {{cfsIsOwner}} (with file as current context)
    //(2) {{cfsIsOwner file=file}}
    //(3) {{cfsIsOwner fileId=fileId collection="Collection"}}
    //Usage (Is user with userId the owner?):
    //(1) {{cfsIsOwner userId=userId}} (with file as current context)
    //(2) {{cfsIsOwner file=file userId=userId}}
    //(3) {{cfsIsOwner fileId=fileId collection="Collection" userId=userId}}
    Handlebars.registerHelper('cfsIsOwner', function(opts) {
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
    //(1) {{cfsFormattedSize}} (with file as current context)
    //(2) {{cfsFormattedSize file=file}}
    //(3) {{cfsFormattedSize fileId=fileId collection="Collection"}}
    //Usage (any format string supported by numeral.format):
    //(1) {{cfsFormattedSize formatString=formatString}} (with file as current context)
    //(2) {{cfsFormattedSize file=file formatString=formatString}}
    //(3) {{cfsFormattedSize fileId=fileId collection="Collection" formatString=formatString}}
    Handlebars.registerHelper('cfsFormattedSize', function(opts) {
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
    //(1) {{cfsFileHandlers}} (with file as current context)
    //(2) {{cfsFileHandlers file=file}}
    //(3) {{cfsFileHandlers fileId=fileId collection="Collection"}}
    Handlebars.registerHelper('cfsFileHandlers', function(opts) {
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
    //(1) {{cfsFileUrl "defaultHandler"}} (with file as current context)
    //(2) {{cfsFileUrl "defaultHandler" file=file}}
    //(3) {{cfsFileUrl "defaultHandler" fileId=fileId collection="Collection"}}
    Handlebars.registerHelper('cfsFileUrl', function(fileHandler, opts) {
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
        hash.content = hash.content || "Download";
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
                html = Template._cfsFileInput({
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