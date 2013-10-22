//exported
GQ = GQ || {};

GQ.Task = function(taskData) {
  var self = this;
  self._ready = false; //set to true by the user when the task has been fully set up and can be processed
  self.paused = false;
  self.running = false;
  self.complete = false;
  self.progress = 0;
  self.failures = 0;
  self.taskData = taskData;
  self._deps = {
    progress: new Deps.Dependency,
    paused: new Deps.Dependency
  };
  self.events = {
    error: function() {
    },
    done: function() {
    }
  };
};

GQ.Task.prototype.on = function (event, func) {
  var self = this;
  
  if (typeof func !== "function")
    throw new Error("You must pass a function as the second argument");
  
  if (!(event in self.events))
    throw new Error('"' + event + '" is not a valid task event');
  
  self.events[event] = func;
};

GQ.Task.prototype.getProgress = function() {
  var self = this;
  self._deps.progress.depend();
  return self.progress;
};

GQ.Task.prototype.isPaused = function() {
  var self = this;
  self._deps.paused.depend();
  return self.paused;
};

GQ.Task.prototype.updateProgress = function(value) {
  var self = this;
  if (isNaN(value)) {
    value = 0;
  }
  self.progress = value;
  self._deps.progress.changed();
};

GQ.Task.prototype.done = function(error) {
  var self = this;
  self.progress = 0;
  self._deps.progress.changed();
  self.running = false;
  if (error) {
    self.failures++;
    self.events.error(error);
  } else {
    self.complete = true;
    self.events.done(self);
  }
};

GQ.Task.prototype.ready = function() {
  var self = this;
  self._ready = true;
};

GQ.Task.prototype.pause = function() {
  var self = this;
  self.paused = true;
  self._deps.paused.changed();
};

GQ.Task.prototype.resume = function() {
  var self = this;
  self.paused = false;
  self._deps.paused.changed();
};