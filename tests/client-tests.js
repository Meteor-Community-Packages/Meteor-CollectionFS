function equals(a, b) {
  return !!(EJSON.stringify(a) === EJSON.stringify(b));
}

Tinytest.add('cfs-access-point - client - test environment', function(test) {
  test.isTrue(typeof FS.Collection !== 'undefined', 'test environment not initialized FS.Collection');
  test.isTrue(typeof FS.HTTP !== 'undefined', 'test environment not initialized FS.HTTP');
});

Tinytest.addAsync('cfs-access-point - client - addTestImage', function (test, onComplete) {
  test.isTrue(true);
  Meteor.call('addTestImage', function(err, result) {
    test.isTrue(result);
    onComplete();
  });
  test.isTrue(true);
});

Tinytest.addAsync('cfs-access-point - client - GET list of files in collection', function (test, onComplete) {

  HTTP.get(Meteor.absoluteUrl('cfs/record/images'), function(err, result) {
    // Test the length of array result
    var len = result.data && result.data.length;
    test.isTrue(!!len, 'Result was empty');
    // Get the object
    var obj = result.data && result.data[0] || {};
    test.equal(obj.$type, 'FS.File', 'Didn\'t get the expected result');
    onComplete();
  });

});

//Test API:
//test.isFalse(v, msg)
//test.isTrue(v, msg)
//test.equalactual, expected, message, not
//test.length(obj, len)
//test.include(s, v)
//test.isNaN(v, msg)
//test.isUndefined(v, msg)
//test.isNotNull
//test.isNull
//test.throws(func)
//test.instanceOf(obj, klass)
//test.notEqual(actual, expected, message)
//test.runId()
//test.exception(exception)
//test.expect_fail()
//test.ok(doc)
//test.fail(doc)
//test.equal(a, b, msg)
