// REMOVE: When engien branche is merged with master in Meteor v0.6.0 ?
if (!npm) {
  var npm = {
    require: __meteor_bootstrap__.require
  };
}

// Init config flags
__meteor_runtime_config__.FILEHANDLER_SUPPORTED = false;

__filehandlers = {
  folder: 'cfs',
  serverPath: '',
  bundlePath: '',
  url: '/cfs',
  rootDir: '',
  bundleRoot: '',
  created: false
};


(function() {
	var fs = npm.require('fs');

	var path = npm.require('path');

  __filehandlers.bundleRoot = path.dirname(npm.require.main.filename);
  var splitDir = __filehandlers.bundleRoot.split('/');
  for (var i = 0; i < splitDir.length - 1; i++)
    __filehandlers.rootDir += splitDir[i] + '/';
  
  __filehandlers.bundlePath = __filehandlers.bundleRoot + '/static/' + __filehandlers.folder;
  __filehandlers.serverPath = __filehandlers.rootDir + '' + __filehandlers.folder;

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


//DEBUG:  
  __meteor_runtime_config__.FILEHANDLER_BUNDLE = __filehandlers.bundlePath;

})();

