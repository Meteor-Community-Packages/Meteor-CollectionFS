var myConsole = new Meteor.Collection('_console');
var timeConsole = Date.now();

var getAllLogs = true;
var debug = true;

if (Meteor.isClient) {
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

if (Meteor.isServer) {

	myConsole.remove({});

	Meteor.publish('myConsole', function() {
		return myConsole.find({ createdAt : { $gt: timeConsole } });
	});

	Meteor.methods({
		getTime: function() {
			myLog('getTime');
			return (getAllLogs)? 0 : Date.now()-6000;
		}
	});
}

function myLog(message) {
	myConsole.insert({ message: message, createdAt: Date.now() });
}