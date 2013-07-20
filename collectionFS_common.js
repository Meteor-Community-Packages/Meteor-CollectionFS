"use strict";

// Make files basic functions available in CollectionFS
_.extend(CollectionFS.prototype, {
	find: function() {
    return this.files.find.apply(this.files, arguments);
  },
	findOne: function() {
    return this.files.findOne.apply(this.files, arguments);
  },
	update: function() {
    return this.files.update.apply(this.files, arguments);
  },
	remove: function() {
    return this.files.remove.apply(this.files, arguments);
  },
	allow: function() {
    return this.files.allow.apply(this.files, arguments);
  },
	deny: function() {
    return this.files.deny.apply(this.files, arguments);
  },
	fileHandlers: function(options) {
    _.extend(this._fileHandlers, options);
  },
  filter: function(options) {
    //clean up filter option values
    if (!options.allow || !Match.test(options.allow, Object)) {
      options.allow = {};
    }
    if (!options.deny || !Match.test(options.deny, Object)) {
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

    this._filter = options;
  },
  fileIsAllowed: function(fileRecord) {
    var self = this;
    if (!self._filter) {
      return true;
    }
    if (!fileRecord || !fileRecord.contentType || !fileRecord.filename) {
      throw new Error("invalid fileRecord:", fileRecord);
    }
    var fileSize = fileRecord.size || parseInt(fileRecord.length, 10);
    if (!fileSize || isNaN(fileSize)) {
      throw new Error("invalid fileRecord file size:", fileRecord);
    }
    var filter = self._filter;
    if (filter.maxSize && fileSize > filter.maxSize) {
      self.dispatch('invalid', { maxFileSizeExceeded: true }, fileRecord);
      return false;
    }
    var saveAllFileExtensions = (filter.allow.extensions.length === 0);
    var saveAllContentTypes = (filter.allow.contentTypes.length === 0);
    var ext = getFileExtension(fileRecord.filename);
    var contentType = fileRecord.contentType;
    if (!((saveAllFileExtensions ||
            _.indexOf(filter.allow.extensions, ext) !== -1) &&
            _.indexOf(filter.deny.extensions, ext) === -1)) {
      self.dispatch('invalid', { disallowedExtension: true }, fileRecord);
      return false;
    }
    if (!((saveAllContentTypes ||
            contentTypeInList(filter.allow.contentTypes, contentType)) &&
            !contentTypeInList(filter.deny.contentTypes, contentType))) {
      self.dispatch('invalid', { disallowedContentType: true }, fileRecord);
      return false;
    }
    return true;
  },
  events: function (events) {
    var self = this;
    _.extend(self._events, events);
  },
  dispatch: function (/* arguments */) {
    var self = this, args = _.toArray(arguments);
    var eventName = args.shift();
    self._events[eventName].apply(self, args);
  }
});

_.extend(_queueCollectionFS.prototype, {
	queue: {},
	chunkSize: 256 * 1024,    //gridFS default is 256kb = 262.144bytes
	compareFile: function(fileRecordA, fileRecordB) {
		var errors = 0;
		var leaveOutField = {
      '_id': true,
      'uploadDate': true,
      'currentChunk': true,
      'fileHandler': true
    };
		for (var fieldName in fileRecordA) {
			if (!leaveOutField[fieldName]) {
				if (fileRecordA[fieldName] !== fileRecordB[fieldName]) {
					errors++;
					console.log(fieldName);
				}
			}
		} //EO for
		return (errors === 0);
	},
	makeGridFSFileRecord: function(file, metadata) {
		var self = this;
		var countChunks = Math.ceil(file.size / self.chunkSize);
		var userId = (Meteor.isClient)?
						( (this.userId) ? this.userId: Meteor.userId() ): file.owner;
		var encoding = (file.encoding && file.encoding !== '') ?
            file.encoding : 'utf-8';

		return {
      chunkSize : self.chunkSize,	// Default 256kb ~ 262.144 bytes
      uploadDate : Date.now(),		// Client/Server set date
      handledAt: null,            // datetime set by Server when handled
      fileHandler: {},            // fileHandler supplied data if any
      md5 : null,                 // Not yet implemented
      complete : false,           // countChunks == numChunks
      currentChunk: -1,           // Used to coordinate clients
      owner: userId,
      countChunks: countChunks,		// Expected number of chunks
      numChunks: 0,               // number of chunks in database
      filename : file.name,       // Original filename
      length: ''+file.size,       // Issue in Meteor, when solved dont use ''+
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
