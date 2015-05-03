FS.CollectionObservers = {};

FS.CollectionObservers.register = function(fsCollection){

  // Emit "removed" event on collection
  fsCollection.files.find().observe({
    removed: function(fsFile) {
      console.log('Collection Observer:', fsFile._id, 'removed from collection', fsCollection.name);
      fsCollection.emit('removed', fsFile);
    }
  });

  // Observe files that have been stored so we can delete any temp files
  fsCollection.files.find(getDoneQuery(fsCollection.options.stores)).observe({
    added: function(fsFile) {
      console.log('Collection Observer: All stores complete for', fsFile._id, 'on collection', fsCollection.name);
      fsCollection.emit('allStoresComplete', fsFile);
    }
  });

}

/**
 *  @method getDoneQuery
 *  @private
 *  @param {Array} stores - The stores array from the FS.Collection options
 *
 *  Returns a selector that will be used to identify files where all
 *  stores have successfully save or have failed the
 *  max number of times but still have chunks. The resulting selector
 *  should be something like this:
 *
 *  {
 *    $and: [
 *      {chunks: {$exists: true}},
 *      {
 *        $or: [
 *          {
 *            $and: [
 *              {
 *                'copies.storeName': {$ne: null}
 *              },
 *              {
 *                'copies.storeName': {$ne: false}
 *              }
 *            ]
 *          },
 *          {
 *            'failures.copies.storeName.doneTrying': true
 *          }
 *        ]
 *      },
 *      REPEATED FOR EACH STORE
 *    ]
 *  }
 *
 */
function getDoneQuery(stores) {
  var selector = {
    $and: []
  };

  // Add conditions for all defined stores
  FS.Utility.each(stores, function(store) {
    var storeName = store.name;
    var copyCond = {$or: [{$and: []}]};
    var tempCond = {};
    tempCond["copies." + storeName] = {$ne: null};
    copyCond.$or[0].$and.push(tempCond);
    tempCond = {};
    tempCond["copies." + storeName] = {$ne: false};
    copyCond.$or[0].$and.push(tempCond);
    tempCond = {};
    tempCond['failures.copies.' + storeName + '.doneTrying'] = true;
    copyCond.$or.push(tempCond);
    selector.$and.push(copyCond);
  })

  return selector;
}