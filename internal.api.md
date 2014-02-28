> File: ["shared.js"](shared.js)
> Where: {client|server}

-
#############################################################################

HELPERS

#############################################################################
XXX: should this be exported?? Where is it used?

#### <a name="_Utility.defaultZero"></a>_Utility.defaultZero(val)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method __defaultZero__ is defined in `_Utility`*

__Arguments__

* __val__ *{Any}*  
Returns number or 0 if value is a falsy

-

> ```_Utility.defaultZero = function(val) { ...``` [shared.js:33](shared.js#L33)

-

#### <a name="validateAction"></a>validateAction(validators, fileObj, userId)&nbsp;&nbsp;<sub><i>Anywhere</i></sub> ####
-
*This method is private*

__Arguments__

* __validators__ *{Object}*  
 The validators object to use, with `deny` and `allow` properties.
* __fileObj__ *{[FS.File](#FS.File)}*  
 Mounted or mountable file object to be passed to validators.
* __userId__ *{String}*  
 The ID of the user who is attempting the action.

-

__Returns__  *{undefined}*


Throws a "400-Bad Request" Meteor error if the file is not mounted or
a "400-Access denied" Meteor error if the action is not allowed.

> ```FS.Utility.validateAction = function validateAction(validators, fileObj, userId) { ...``` [shared.js:187](shared.js#L187)

-
