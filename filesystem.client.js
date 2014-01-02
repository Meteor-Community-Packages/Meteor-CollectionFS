// Warn the user if they try to use the FileSystemStore from the client-side
FS.FileSystemStore = function() {
  throw new Error('FS.FileSystemStore cannot be used in client-side code');
};