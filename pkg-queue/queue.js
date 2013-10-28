//TODO tasks are not currently removed from the queue, even if they've completed
//or failed the max number of times. Possibly should remove them after some configurable
//amount of time, especially if persistent tasks are implemented.

//exported
GQ = GQ || {};

GQ.Queue = function(options) {
  var self = this;
  options = options || {};

  // ONLY first-in-first-out IS IMPLEMENTED
  self.type = options.type || 'fifo';

  // max number of tasks running at the same time
  self.maxThreads = options.maxThreads || 5;

  // max number of times a task should be attempted
  self.maxFailures = options.maxFailures || 5;
  
  // a collection (unmanaged?) in which tasks can be stored to persist on browser or app reload
  self.collection = options.collection || null; //TODO: NOT YET IMPLEMENTED

  self.taskHandler = function() {
  };

  self._tasks = [];

  self._deps = {
    paused: new Deps.Dependency,
    stopped: new Deps.Dependency
  };
  self._paused = false;
  self._stopped = true;
};

/*
 * Public API
 */

GQ.Queue.prototype.addTask = function(taskData) {
  var self = this, task = new GQ.Task(taskData);
  console.log("Task added to queue: ", task);
  self._tasks.push(task);
  self._checkQueue();
  return task;
};

GQ.Queue.prototype.pause = function() {
  var self = this;
  
  if (self._paused)
    return;
  
  self._paused = true;
  self._deps.paused.changed();
};

GQ.Queue.prototype.resume = function() {
  var self = this;
  
  if (!self._paused)
    return;
  
  self._paused = false;
  self._deps.paused.changed();
};

GQ.Queue.prototype.stop = function() {
  var self = this;
  
  if (self._stopped)
    return;
  
  self._stopped = true;
  self._deps.stopped.changed();
};

GQ.Queue.prototype._checkQueue = function () {
  var self = this;
  if (!self.maxThreads) {
    self.checkQueue();
  } else {
    for (var i = 0; i < self.maxThreads; i++) {
      Meteor.setTimeout(function() {
        self.checkQueue();
      });
    }
  }
};

GQ.Queue.prototype.start = function() {
  var self = this;

  if (!self._stopped)
    return;

  self._stopped = false;
  self._deps.stopped.changed();
  self._checkQueue();
};

GQ.Queue.prototype.isStopped = function() {
  var self = this;
  self._deps.stopped.depend();
  return self._stopped;
};

GQ.Queue.prototype.isPaused = function() {
  var self = this;
  self._deps.paused.depend();
  return self._paused;
};

GQ.Queue.prototype.checkQueue = function() {
  var self = this;

  if (!self.taskHandler)
    throw new Error("You must define a taskHandler for your queue");

  if (self._paused)
    return;

  //get next item in queue that is ready to be worked
  var queueCount = self._tasks.length, task;
  for (var i = 0; i < queueCount; i++) {
    task = self._tasks[i];
    if (task.ready && !task.running && !task.complete && task.failures < self.maxFailures) {
      break; //let's stop looping and work this task
    } else {
      task = null;
    }
  }

  //work it
  if (task) {
    task.running = true;
    try {
      self.taskHandler(task);
    } catch (e) {
      task.done(e);
    }
  }

  //check the queue again on this "thread" in 1 second, unless we're out of tasks
  if (task && !self._stopped) {
    Meteor.setTimeout(function() {
      self.checkQueue();
    }, 1000);
  }
};