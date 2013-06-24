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
    //(1) {{queueProgress "Collection"}} (with file as current context)
    //(2) {{queueProgress "Collection" file=file}}
    //(3) {{queueProgress "Collection" fileId=fileId}}
    Handlebars.registerHelper('queueProgress', function(collection, opts) {
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

    //Usage: (TODO)
    Handlebars.registerHelper('fileInput', function(options) {
        var html = "", opt = options.hash, styles;
        switch (opt.type) {
            case "file":
                html += '<input type="file" class="collectionFSFileInput' + (opt.class ? ' ' + opt.class : '') + '"' + (opt.id ? ' id="' + opt.id + '"' : '') + (opt.name ? ' name="' + opt.name + '"' : '') + (opt.multiple ? ' multiple' : '') + ' />';
                if (opt.collection) {
                    document.addEventListener('change', function(e) {
                        var elem = e.target, files = elem.files;
                        if (elem.classList.contains('collectionFSFileInput')) {
                            if (files) {
                                var path = opt.storeIdsIn, set = {}, collectionName, indexOfFirstDot;
                                var ids = window[opt.collection].storeFile(files);
                                if (path && path.length) {
                                    indexOfFirstDot = path.indexOf('.');
                                    if (indexOfFirstDot === -1) {
                                        return;
                                    }
                                    collectionName = path.slice(0, indexOfFirstDot);
                                    path = path.slice(indexOfFirstDot + 1);

                                    if (opt.multiple) {
                                        setObjByString(set, path, ids);
                                    } else {
                                        if (ids.length) {
                                            setObjByString(set, path, ids[0]);
                                        } else {
                                            setObjByString(set, path, null);
                                        }
                                    }
                                    window[collectionName].update(opt.storeIdsFor, {$set: set});
                                }
                            }
                        }
                    }, false);
                }
                break;
            case "image":
                if (opt.style === "basic") {
                    styles = "min-height: 200px; border: 1px solid #cccccc;";
                }
                html += '<div class="collectionFSImageFileInput' + (opt.class ? ' ' + opt.class : '') + '"' + (opt.id ? ' id="' + opt.id + '"' : '') + (opt.name ? ' name="' + opt.name + '"' : '') + (opt.styles ? ' style="' + opt.styles + '"' : '') + '></div>';
                if (opt.collection) {
                    if (typeof window.FileReader !== 'undefined') {
                        document.addEventListener('drop', function(e) {
                            var elem = e.target, files, f, reader;
                            if (elem.classList.contains('collectionFSImageFileInput')) {
                                e.preventDefault();
                                files = e.dataTransfer.files;
                                if (files) {
                                    for (var i = 0, ln = files.length; i < ln; i++) {
                                        f = files[i];
                                        window[opt.collection].storeFile(f);
                                        reader = new FileReader();
                                        reader.onload = function(event) {
                                            var div = document.createElement("div");
                                            div.style.background = 'url(' + event.target.result + ') no-repeat center';
                                            elem.appendChild(div);
                                        };
                                        reader.readAsDataURL(f);
                                    }
                                }
                            }
                        }, false);
                    }
                }
                break;
        }
        return new Handlebars.SafeString(html);
    });
}