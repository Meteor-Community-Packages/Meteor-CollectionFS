// REMOVE: When engien branche is merged with master in Meteor v0.6.0 ?
if (!npm) {
  var npm = {
    require: __meteor_bootstrap__.require
  };
}

// Init config flags
__meteor_runtime_config__.FILEHANDLER_SUPPORTED = false;

__filehandlers = {
  // Filesystem configuration
  folder: 'cfs',          // Main folder to place collectionFS filehandler folders in
  serverPath: '',         // Auto
  bundlePath: '',         // Auto
  url: '',                // Auto
  rootDir: '',            // Auto
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


(function() {
	var fs = npm.require('fs');

	var path = npm.require('path');
  __filehandlers.url = '/' + __filehandlers.folder;
  __filehandlers.bundleRoot = path.dirname(npm.require.main.filename);
  __filehandlers.rootDir = path.join(__filehandlers.bundleRoot, '..') + path.sep;
  __filehandlers.bundlePath = path.join(__filehandlers.bundleRoot, 'static', __filehandlers.folder);
  __filehandlers.serverPath = path.join(__filehandlers.rootDir, __filehandlers.folder);

  myLog('bundlePath: '+__filehandlers.bundlePath);
  myLog('serverPath: '+__filehandlers.serverPath);

  try {
    fs.rmdirSync(__filehandlers.bundlePath);
  } catch(e) { /* NOP */}

  try {
    fs.unlinkSync(__filehandlers.bundlePath);
  } catch(e) { /* NOP  */}

  if (!fs.existsSync(__filehandlers.serverPath))
    fs.mkdirSync(__filehandlers.serverPath);

  if (!!fs.existsSync(__filehandlers.serverPath)) {
    myLog('Create symlinkSync');
    fs.symlinkSync( __filehandlers.serverPath, __filehandlers.bundlePath );
  }

  __filehandlers.created = (!!fs.existsSync(__filehandlers.bundlePath));

	__meteor_runtime_config__.FILEHANDLER_SUPPORTED = fs.existsSync(__filehandlers.serverPath); 

})();

