
#### <a name="FS.File.fromUrl"></a>*fsFile*.fromUrl(url, filename, callback)&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __fromUrl__ is defined in `FS.File`*

__Arguments__

* __url__ *{String}*  
* __filename__ *{String}*  
* __callback__ *{Function}*  

-

__Returns__  *{undefined}*

Loads data from `url` into a new FS.File with `name = filename`,
and then passes the new FS.File instance to `callback(err, fsFile)`.


> ```FS.File.fromUrl = function(url, filename, callback) { ...``` [fsFile-client.js:12](fsFile-client.js#L12)

-

#### <a name="FS.File.prototype.saveLocal"></a>*fsFile*.saveLocal([filename])&nbsp;&nbsp;<sub><i>Client</i></sub> ####
-
*This method __saveLocal__ is defined in `prototype` of `FS.File`*

__Arguments__

* __filename__ *{String}*    (Optional)

-

__Returns__  *{undefined}*

Tells the browser to save the file like a normal downloaded file,
using the provided filename, or the `name` property if `filename`
is not provided.


> ```FS.File.prototype.saveLocal = function(filename) { ...``` [fsFile-client.js:34](fsFile-client.js#L34)

-
