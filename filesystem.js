var fs = Npm.require('fs');
var path = Npm.require('path');
var mkdirp = Npm.require('mkdirp');
var chokidar = Npm.require('chokidar');

FS.FileSystemStore = function(name, pathname) {
  // Pass home ~ in pathname
  var homepath = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

  // Check if we have '~/foo/bar'
  if (pathname.split(path.sep)[0] === '~') {
    pathname = pathname.replace('~', homepath);
  }

  // Set absolute path
  var absolutePath = path.resolve(pathname);
  
  // Ensure the path exists
  mkdirp.sync(absolutePath);
  console.log(name + ' FileSystem mounted on: ' + absolutePath);

  return new FS.StorageAdapter(name, {}, {
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
      if (start instanceof Number && end instanceof Number) {
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
                console.log("FileSystemStore getBytes: Error closing file");
              callback(null, bytesRead, buffer);
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

      console.log('Watching ' + absolutePath);

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