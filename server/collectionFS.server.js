//Server cache worker, idear:
//
//Basics
//On server load init worker and taskQue if needed by collection if (fileHandlers)
//When client confirms upload run user defined functions on file described in fileHandlers
//if null returned then proceed to the next function in fileHandler array
//if data returned then put it in a file in the /public/cfs/collection._name folder and update url array reference in database, triggers reactive update UI
//Note: updating files in public refreshes server? - find solution later, maybe patch meteor core?
//
//In model:
//CollectionFS.fileHandlers({
//  //Default image cache
//  handler['default']: function(fileId, blob) {
//    return blob;
//  },
//  //Some specific
//  handler['40x40']: function(fileId, blob) {
//     //Some serverside image/file handling functions, user can define this
//     return blob;
//   },
//  //Upload to remote server
//  handler['remote']: function(fileId, blob) {
//     //Some serverside imagick/file handling functions, user can define this
//     return null;
//   },
//   
// });
//
// Server:
// on startup queListener spawned if needed by collectionFS - one queListener pr collectionFS
// queListener spawns fileHandlers pr. item in fileHandlerQue as setTimeout(, 0) and delete item from que
// if empty que then die and wait, spawn by interval
//
// fileHandlers die after ended
// 
// Client:
// When upload confirmed complete, set fs.files.complete and add _id to collectionFS.fileHandlerQue (wich triggers a worker at interval)
//
