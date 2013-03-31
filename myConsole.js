/* Just a simple console to get server console in client, Regz. RaiX 2013 */

var myConsole = new Meteor.Collection('_console');

function myLog(message) {
	myConsole.insert({ message: message, createdAt: Date.now() });
}

(function() {

	var timeConsole = Date.now();

	// Set true to get all logs from server start
	var getAllLogs = false;
	// Enable / disable logging
	var debug = false;

	if (Meteor.isClient && debug) {
		Meteor.call('getTime', function(error, result) {
			timeConsole = +result;
			if (error)
				console.log('getTime error: '+error.message);
			console.log('Got server time: '+result);
			Deps.autorun(function() {
				myConsole.find({ createdAt: { $gt: timeConsole } }).forEach(function(doc) {
					console.log('SERVER: ' + doc.message);
					timeConsole = doc.createdAt;
				});
			});
		});

		if (debug)
			Meteor.subscribe('myConsole');
	}

	if (Meteor.isServer && debug) {

		myConsole.remove({});

		if (debug)
			Meteor.publish('myConsole', function() {
				return myConsole.find({ createdAt : { $gt: timeConsole } });
			});

		Meteor.methods({
			getTime: function() {
				myLog('getTime');
				return (getAllLogs)? 0 : Date.now()-6000; // Just add a little slack
			}
		});
	}

})();