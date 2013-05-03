/* Just a simple console to get server console in client, Regz. RaiX 2013 */

// Set true to get all logs from server start
var getAllLogs = false;
// Enable / disable logging
var debug = false;


var myConsole = new Meteor.Collection('_console');

serverConsole = {
	log: function (message) {
		if (debug) {
			console.log(message);
			myConsole.insert({ message: message, createdAt: Date.now() });
		}
	}
};

var timeConsole = Date.now();

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
		}, {is_auto: true});

	Meteor.methods({
		getTime: function() {
			serverConsole.log('getTime');
			return (getAllLogs)? 0 : Date.now()-20000; // Just add a little slack
		}
	});
}