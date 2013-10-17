"use strict";
/*
 * BEGIN NPM CHECKS
 */
if (typeof Npm === 'undefined')
  throw new Error('collectionFS: Please update Meteor');

if (!Npm.bundleRoot) {
  var path = Npm.require('path');
  _.extend(Npm, {
    bundleRoot: (process && process.mainModule &&
            process.mainModule.filename) ?
            path.join(process.mainModule.filename, '..') : ''
  });
}

if (!Npm.bundleRoot)
  throw new Error('Cannot find bundle root directory');
/*
 * END NPM CHECKS
 */

var fs = Npm.require('fs');
var path = Npm.require('path');

/*
 * BEGIN CONFIGURATION
 */
__meteor_runtime_config__.FILEHANDLER_SUPPORTED = false;

// Filesystem configuration
var fsConfig = {
  folder: 'cfs', // Main folder to place filehandler folders in
  serverPath: '', // Auto
  bundlePath: '', // Auto
  url: '', // Auto
  rootDir: '', // Auto
  bundleStaticPath: '', // Auto
  bundleRoot: '', // Auto
  created: false // Auto
};

fsConfig.url = '/' + fsConfig.folder;
fsConfig.bundleRoot = Npm.bundleRoot;
fsConfig.rootDir = path.join(fsConfig.bundleRoot, '..') + path.sep;
fsConfig.bundleStaticPath = path.join(fsConfig.bundleRoot, 'static');
fsConfig.bundlePath = path.join(fsConfig.bundleStaticPath, fsConfig.folder);
fsConfig.serverPath = path.join(fsConfig.rootDir, fsConfig.folder);

serverConsole.log('bundlePath: ' + fsConfig.bundlePath);
serverConsole.log('serverPath: ' + fsConfig.serverPath);

// Check if the bundle static folder exists, if not then create Issue #40
if (!fs.existsSync(fsConfig.bundleStaticPath)) {
  fs.mkdirSync(fsConfig.bundleStaticPath);
}

// Remove symlink
try {
  fs.rmdirSync(fsConfig.bundlePath);
} catch (e) { /* NOP */
}

try {
  fs.unlinkSync(fsConfig.bundlePath);
} catch (e) { /* NOP  */
}

// Check if server path exists, if not then create
if (!fs.existsSync(fsConfig.serverPath)) {
  fs.mkdirSync(fsConfig.serverPath);
}

// Create symlink
if (!!fs.existsSync(fsConfig.serverPath)) {
  serverConsole.log('Create symlinkSync');
  fs.symlinkSync(fsConfig.serverPath, fsConfig.bundlePath);
}

fsConfig.created = (!!fs.existsSync(fsConfig.bundlePath));

__meteor_runtime_config__.FILEHANDLER_SUPPORTED = fs.existsSync(fsConfig.serverPath);

/*
 * END CONFIGURATION
 */

//extend FileObject with FileSystem-specific methods
if (typeof FileObject !== "undefined") {
  FileObject.prototype.putFilesystem = function(options) {
    var self = this;
    options = _.extend({
      subfolder: "default",
      extension: null
    }, options);

    var destination = self._getFileSystemDestination(options)
    fs.writeFileSync(destination.serverFilename, self.buffer);

    if (!fs.existsSync(destination.serverFilename)) {
      return false;
    }

    //return all info needed to retrieve or delete
    return {
      url: destination.url,
      filePath: destination.serverFilename
    };
  };

  FileObject.prototype.delFilesystem = function(info) {
    if (fs.existsSync(info.filePath)) {
      fs.unlinkSync(info.filePath);
    }
    return true;
  };

  FileObject.prototype._getFileSystemDestination = function(options) {
    var self = this;
    var serverPath = path.join(fsConfig.serverPath, options.subfolder); // Server path
    var pathURL = fsConfig.url + '/' + options.subfolder; // Url path

    if (!fs.existsSync(serverPath)) {
      fs.mkdirSync(serverPath);
    }

    if (!fs.existsSync(serverPath))
      throw new Error("could not create serverPath");

    // Make newExtension optional, fallback to fileRecord.filename
    var extension = options.extension || path.extname(self.filename);
    // Remove optional leading '.' from extension name
    extension = (extension.substr(0, 1) === '.') ? extension.substr(1) : extension;
    // Construct filename from current numeric date and extension
    var myFilename = Date.now() + '.' + extension;
    return {
      serverFilename: path.join(serverPath, myFilename),
      url: pathURL + '/' + myFilename
    };
  };
}