// Make files basic functions available in CollectionFS
_.extend(CollectionFS.prototype, {
	find: function() { return this.files.find.apply(this.files, arguments); },
	findOne: function() { return this.files.findOne.apply(this.files, arguments); },
	update: function() { return this.files.update.apply(this.files, arguments); },
	remove: function() { return this.files.remove.apply(this.files, arguments); },
	allow: function() { return this.files.allow.apply(this.files, arguments); },
	deny: function() { return this.files.deny.apply(this.files, arguments); },
	fileHandlers: function(options) { _.extend(this._fileHandlers, options); },
        fileFilter: function(options) {
            options = cleanOptions(options);
            this._fileFilter = options;
        },
        fileIsAllowed: function(fileRecord) {
            var self = this;
            if (!self._fileFilter) {
                return true;
            }
            if (!fileRecord || !fileRecord.contentType || !fileRecord.filename || !fileRecord.size) {
                return false;
            }
            var filter = self._fileFilter;
            if (filter.maxSize && fileRecord.size > filter.maxSize) {
                self.onInvalid && self.onInvalid('tooBig', fileRecord);
                return false;
            }
            var saveAllFileExtensions = (filter.allow.extensions.length === 0);
            var saveAllContentTypes = (filter.allow.contentTypes.length === 0);
            var ext = getFileExtension(fileRecord.filename);
            var contentType = fileRecord.contentType;
            if (!((saveAllFileExtensions || _.indexOf(filter.allow.extensions, ext) !== -1) &&
                    _.indexOf(filter.deny.extensions, ext) === -1)) {
                self.onInvalid && self.onInvalid('disallowedExtension', fileRecord);
                return false;
            }
            if (!((saveAllContentTypes || contentTypeInList(filter.allow.contentTypes, contentType)) &&
                    !contentTypeInList(filter.deny.contentTypes, contentType))) {
                self.onInvalid && self.onInvalid('disallowedContentType', contentType);
                return false;
            }
            return true;
        }
});

_.extend(_queueCollectionFS.prototype, {
	queue: {},
	chunkSize: 256 * 1024,    //gridFS default is 256kb = 262.144bytes
	compareFile: function(fileRecordA, fileRecordB) {
		var errors = 0;
		var leaveOutField = {'_id':true, 'uploadDate':true, 'currentChunk':true, 'fileHandler': true };
		for (var fieldName in fileRecordA) {
			if (!leaveOutField[fieldName]) {
				if (fileRecordA[fieldName] != fileRecordB[fieldName]) {
					errors++; 
					console.log(fieldName);
				}
			}
		} //EO for
		return (errors == 0);
	},
	makeGridFSFileRecord: function(file, metadata) {
		var self = this;
		var countChunks = Math.ceil(file.size / self.chunkSize);
		var userId = (Meteor.isClient)?
						( (this.userId) ? this.userId: Meteor.userId() ): file.owner;
		var encoding = (file.encoding && file.encoding != '') ? file.encoding : 'utf-8';

		return {
		  chunkSize : self.chunkSize,	// Default 256kb ~ 262.144 bytes
		  uploadDate : Date.now(),		// Client/Server set date
		  handledAt: null, 				// datetime set by Server when handled
		  fileHandler: {}, 				// fileHandler supplied data if any
		  md5 : null,					// Not yet implemented
		  complete : false,				// countChunks == numChunks
		  currentChunk: -1,				// Used to coordinate clients
		  owner: userId,
		  countChunks: countChunks,		// Expected number of chunks
		  numChunks: 0,					// number of chunks in database
		  filename : file.name,			// Original filename
		  length: ''+file.size, 		// Issue in Meteor, when solved dont use ''+
		  contentType : file.type,
		  encoding: encoding,			// Default 'utf-8'
		  metadata : (metadata) ? metadata : null // Custom data
		/* TODO:
		    startedAt: null,          // Start timer for upload start
		    endedAt: null,            // Stop timer for upload ended
		*/
		};
		// TODO: Implement md5 later, guess every chunk should have a md5...
		// TODO: checkup on gridFS date format
	} //EO makeGridFSFileRecord
});

//utility functions
getFileExtension = function(name) {
    var found = name.lastIndexOf('.') + 1;
    return (found > 0 ? name.substr(found) : "");
};

contentTypeInList = function(list, contentType) {
    var listType, found = false;
    for (var i = 0, ln = list.length; i < 10; i++) {
        listType = list[i];
        if (listType === contentType) {
            found = true;
            break;
        }
        if (listType === "image/*" && contentType.indexOf("image/") === 0) {
            found = true;
            break;
        }
        if (listType === "audio/*" && contentType.indexOf("audio/") === 0) {
            found = true;
            break;
        }
        if (listType === "video/*" && contentType.indexOf("video/") === 0) {
            found = true;
            break;
        }
    }
    return found;
};

setObjByString = function(obj, str, val) {
    var keys, key;
    //make sure str is a nonempty string
    if (!isNonEmptyString(str)) {
        return false;
    }
    if (!isObject(obj)) {
        //if it's not an object, make it one
        obj = {};
    }
    keys = str.split(".");
    while (keys.length > 1) {
        key = keys.shift();
        if (obj !== Object(obj)) {
            //if it's not an object, make it one
            obj = {};
        }
        if (!(key in obj)) {
            //if obj doesn't contain the key, add it and set it to an empty object
            obj[key] = {};
        }
        obj = obj[key];
    }
    return obj[keys[0]] = val;
};

isString = function(str) {
    return Object.prototype.toString.call(str) === "[object String]";
};

isNonEmptyString = function(str) {
    return isString(str) && str.length;
};

isObject = function(obj) {
    return obj === Object(obj);
};

var cleanOptions = function(options) {
    //clean up fileFilter option values
    if (!options.allow || !isObject(options.allow)) {
        options.allow = {};
    }
    if (!options.deny || !isObject(options.deny)) {
        options.deny = {};
    }
    if (!options.maxSize || !_.isNumber(options.maxSize)) {
        options.maxSize = false;
    }
    if (!options.allow.extensions || !_.isArray(options.allow.extensions)) {
        options.allow.extensions = [];
    }
    if (!options.allow.contentTypes || !_.isArray(options.allow.contentTypes)) {
        options.allow.contentTypes = [];
    }
    if (!options.deny.extensions || !_.isArray(options.deny.extensions)) {
        options.deny.extensions = [];
    }
    if (!options.deny.contentTypes || !_.isArray(options.deny.contentTypes)) {
        options.deny.contentTypes = [];
    }
    
    return options;
};