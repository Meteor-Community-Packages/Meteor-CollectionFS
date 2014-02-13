var fs = Npm.require('fs');
var path = Npm.require('path');
var mkdirp = Npm.require('mkdirp');
var chokidar = Npm.require('chokidar');

FS.Store.FileSystem = function(name, options) {
  var self = this;
  if (!(self instanceof FS.Store.FileSystem))
    throw new Error('FS.Store.FileSystem missing keyword "new"');

  // We allow options to be string/path empty or options.path
  options = (options !== ''+options)? options || {} : { path: options };

  // Pass home ~ in pathname
  var homepath = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

  // Provide a default FS directory
  var pathname = options.path || '~/cfs/files/name';

  // Check if we have '~/foo/bar'
  if (pathname.split(path.sep)[0] === '~') {
    pathname = pathname.replace('~', homepath);
  }

  // Set absolute path
  var absolutePath = path.resolve(pathname);

  // Ensure the path exists
  mkdirp.sync(absolutePath);
  FS.debug && console.log(name + ' FileSystem mounted on: ' + absolutePath);

  return new FS.StorageAdapter(name, options, {
    typeName: 'storage.filesystem',
    get: function(fileKey, callback) {
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      //make callback safe for Meteor
      var safeCallback = Meteor.bindEnvironment(callback, function(err) {
        throw err;
      });

      // Call node readFile
      fs.readFile(filepath, safeCallback);
    },
    getBytes: function(fileKey, start, end, callback) {
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      // Call node readFile
      if (typeof start === "number" && typeof end === "number") {
        var size = end - start;
        var buffer = new Buffer(size);
        //open file for reading
        fs.open(filepath, 'r', function(err, fd) {
          if (err)
            callback(err);
          //read bytes
          fs.read(fd, buffer, 0, size, start, function(err, bytesRead, buffer) {
            if (err)
              callback(err);
            fs.close(fd, function(err) {
              if (err)
                FS.debug && console.log("FileSystemStore getBytes: Error closing file");
              callback(null, buffer);
            });
          });
        });
      } else {
        callback(new Error('FileSystemStore getBytes: Invalid start or stop values'));
      }
    },
    put: function(id, fileKey, buffer, options, callback) {
      options = options || {};
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

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

      // Call node writeFile
      fs.writeFile(filepath, buffer, Meteor.bindEnvironment(function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, fileKey);
        }
      }, function(err) {
        throw err;
      }));
    },
    del: function(fileKey, callback) {
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      //make callback safe for Meteor
      var safeCallback = Meteor.bindEnvironment(callback, function(err) {
        throw err;
      });

      // Call node unlink file
      fs.unlink(filepath, safeCallback);
    },
    stats: function(fileKey, callback) {
      // this is the Storage adapter scope
      var filepath = path.join(absolutePath, fileKey);

      //make callback safe for Meteor
      var safeCallback = Meteor.bindEnvironment(callback, function(err) {
        throw err;
      });

      fs.stat(filepath, safeCallback);
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
    },
    init: function() {
    }
  });
};
