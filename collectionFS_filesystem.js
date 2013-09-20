var fs = Npm.require('fs');
var path = Npm.require('path');

// REMOVE: When engien branche is merged with master in Meteor v0.6.0 ?
if (typeof Npm === 'undefined') {
  // Polyfill for Npm
  //var path = __meteor_bootstrap__ && _meteor_bootstrap__.require('path');
  // Npm = {
  //   // require: __meteor_bootstrap__.require,
  //   // bundleRoot: path.dirname(__meteor_bootstrap__.require.main.filename)
  // };
} else {
  // Cannot rely on __meteor_bootstrap__.require.main.filename so we try this:
  if (! Npm.bundleRoot )
    _.extend(Npm, {
      bundleRoot: (__meteor_bootstrap__ && __meteor_bootstrap__.bundle && __meteor_bootstrap__.bundle.root)? __meteor_bootstrap__.bundle.root :
              (process && process.mainModule && process.mainModule.filename)? path.join(process.mainModule.filename, '..') : ''
    });
}


// Test if we have found a bundleRoot
if (! Npm.bundleRoot)
  throw new Error('Cannot find bundle root directory'); 

/**** EO Npm polyfill extended bundleRoot ******/

// Init config flags
__meteor_runtime_config__.FILEHANDLER_SUPPORTED = false;

__filehandlers = {
  // Filesystem configuration
  folder: 'cfs',          // Main folder to place collectionFS filehandler folders in
  serverPath: '',         // Auto
  bundlePath: '',         // Auto TODO: Deprecating
  url: '',                // Auto
  rootDir: '',            // Auto
  bundleStaticPath: '',   // Auto
  bundleRoot: '',         // Auto
  created: false,         // Auto

  // Configuration flags
  MaxRunning: 1,          // Max filehandlers running at the same time in total on server, not pr. collectionFS
  Running: 0,             // Filehandlers running at the same time in total on server, not pr. collectionFS
  MaxFailes: 3,           // Retries each failed filehandler 3 times and moves on to next failed

  // Allow a reset of filehandler failures to try again?
  AllowFailesRetry: 60*1000,      // Wait ms before trying again, if == 0 then disabled
  _AllowFailesRetryLastTime: 0,   // Auto - Carry for wait timer

  // How often to run filehandlers pr. file
  waitBeforeCheckingQueue: 1000,                    // Default 1000ms / 1sec, 0 disables filehandlers
  waitBeforeCheckingQueueWhenNoFilehandlers: 5000   // Default 5000ms / 5sec - no filehandlers defined yet, we wait? 0 disables
};


__filehandlers.url = '/' + __filehandlers.folder;
__filehandlers.bundleRoot = Npm.bundleRoot;
__filehandlers.rootDir = path.join(__filehandlers.bundleRoot, '..') + path.sep;
__filehandlers.bundleStaticPath = path.join(__filehandlers.bundleRoot, 'static');
//__filehandlers.bundlePath = path.join(__filehandlers.bundleStaticPath, __filehandlers.folder);
__filehandlers.serverPath = path.join(__filehandlers.rootDir, __filehandlers.folder);

// console.log('bundlePath: '+__filehandlers.bundlePath); // TODO: deprecating
// console.log('serverPath: '+__filehandlers.serverPath);

// Check if the bundle static folder exists, if not then create Issue #40
if (!fs.existsSync(__filehandlers.bundleStaticPath))
  fs.mkdirSync(__filehandlers.bundleStaticPath);

// // Remove symlink
// try {
//   fs.rmdirSync(__filehandlers.bundlePath);
// } catch(e) {  NOP }

// try {
//   fs.unlinkSync(__filehandlers.bundlePath);
// } catch(e) { /* NOP  */}

// Check if server path exists, if not then create
if (!fs.existsSync(__filehandlers.serverPath))
  fs.mkdirSync(__filehandlers.serverPath);

/*
// Create symlink
if (!!fs.existsSync(__filehandlers.serverPath)) {
  console.log('Create symlinkSync');
  fs.symlinkSync( __filehandlers.serverPath, __filehandlers.bundlePath );
}*/

__filehandlers.created = true; // (!!fs.existsSync(__filehandlers.bundlePath));

__meteor_runtime_config__.FILEHANDLER_SUPPORTED = fs.existsSync(__filehandlers.serverPath); 
