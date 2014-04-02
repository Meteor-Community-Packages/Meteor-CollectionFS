var fs = Npm.require('fs');
var path = Npm.require('path');
var mkdirp = Npm.require('mkdirp');
var chokidar = Npm.require('chokidar');

FS.Store.FileSystem = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.FileSystem))
    throw new Error('FS.Store.FileSystem missing keyword "new"');

  // We allow options to be string/path empty or options.path
  options = (options !== ''+options) ? options || {} : { path: options };

  // Provide a default FS directory one level up from the build/bundle directory
  var pathname = options.path;
  if (!pathname && __meteor_bootstrap__ && __meteor_bootstrap__.serverDir) {
    pathname = path.join(__meteor_bootstrap__.serverDir, '../../../cfs/files/' + name);
  }

  if (!pathname)
    throw new Error('FS.Store.FileSystem unable to determine path');

  // Check if we have '~/foo/bar'
  if (pathname.split(path.sep)[0] === '~') {
    var homepath = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    if (homepath) {
      pathname = pathname.replace('~', homepath);
    } else {
      throw new Error('FS.Store.FileSystem unable to resolve "~" in path');
    }
  }

  // Set absolute path
  var absolutePath = path.resolve(pathname);

  // Ensure the path exists
  mkdirp.sync(absolutePath);
  FS.debug && console.log(name + ' FileSystem mounted on: ' + absolutePath);

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.filesystem',
    fileKey: function(fileObj) {
      return fileObj.collectionName + '-' + fileObj._id + '-' + fileObj.name;
    },
    createReadStream: function(fileKey, options) {
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      // return the read stream - Options allow { start, end }
      return fs.createReadStream(filepath, options);
    },
    createWriteStream: function(fileKey, options) {
      options = options || {};

      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      // XXX: not sure we should have this extra overwrite option?
      if (!options.overwrite) {
        // Change filename if necessary so that we can write to a new file
        var extension = path.extname(fileKey);
        var fn = fileKey.substr(0, fileKey.length - extension.length);
        var suffix = 0;
        while (fs.existsSync(filepath)) {
          suffix++;
          fileKey = fn + suffix + extension; //once we exit the loop, this is what will actually be used
          filepath = path.join(absolutePath, fileKey);
        }
      }

      // Return the stream handle
      var writeStream = fs.createWriteStream(filepath, options);

      // The filesystem does not emit the "end" event only close - so we
      // manually send the end event
      writeStream.on('close', function() {
        if (FS.debug) console.log('SA FileSystem - DONE!! fileKey: "' + fileKey + '"');

        // Get the exact size of the stored file, so that we can pass it to onEnd/onStored.
        // Since stream transforms might have altered the size, this is the best way to
        // ensure we update the fileObj.copies with the correct size.
        fs.stat(filepath, function (error, stats) {
          var size, updatedAt;
          if (stats) {
            size = stats.size;
            updatedAt = stats.mtime;
          }
          // Emit end and return the fileKey, size, and updated date
          writeStream.emit('end', fileKey, size, updatedAt);
        });

      });

      return writeStream;
    },
    remove: function(fileKey, callback) {

      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      try {
        // Call node unlink file
        fs.unlink(filepath, callback);
      }  catch(err) {
        if (typeof callback === 'function') {
          // Send error via callback
          callback(err);
        }
      }
    },
    stats: function(fileKey, callback) {
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      fs.stat(filepath, callback);
    },
    watch: function(callback) {
      function fileKey(filePath) {
        return filePath.replace(absolutePath, "");
      }

      FS.debug && console.log('Watching ' + absolutePath);

      // chokidar seems to be most widely used and production ready watcher
      var watcher = chokidar.watch(absolutePath, {ignored: /\/\./, ignoreInitial: true});
      watcher.on('add', Meteor.bindEnvironment(function(filePath, stats) {
        callback("change", fileKey(filePath), {
          name: path.basename(filePath),
          type: null,
          size: stats.size,
          utime: stats.mtime
        });
      }, function(err) {
        throw err;
      }));
      watcher.on('change', Meteor.bindEnvironment(function(filePath, stats) {
        callback("change", fileKey(filePath), {
          name: path.basename(filePath),
          type: null,
          size: stats.size,
          utime: stats.mtime
        });
      }, function(err) {
        throw err;
      }));
      watcher.on('unlink', Meteor.bindEnvironment(function(filePath) {
        callback("remove", fileKey(filePath));
      }, function(err) {
        throw err;
      }));
    }
  });
};
