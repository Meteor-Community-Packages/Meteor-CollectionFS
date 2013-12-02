function equals(a, b) {
  return !!(EJSON.stringify(a) === EJSON.stringify(b));
}

Tinytest.add('FS.Collection - server - test environment', function(test) {
  test.isTrue(typeof FS.Collection !== 'undefined', 'test environment not initialized FS.Collection');
  test.isTrue(typeof CFSErrorType !== 'undefined', 'test environment not initialized CFSErrorType');
});

/*
 * FS.File Server Tests
 * 
 * construct FO with no arguments
 * load buffer into FO with FO.loadBuffer
 * load buffer into FO and then call FO.toDataUrl with and without callback
 * call FO.loadBinary and make sure it sets FO.buffer properly
 * load buffer into FO and then call FO.toBinary; make sure correct data is returned
 * load buffer into FO and then call FO.getBytes
 * construct FO, set FO.collectionName to a CFS name, and then test FO.update/remove/get/put/del/url
 * (call these with and without callback to test sync vs. async)
 * set FO.name to a filename and test that FO.getExtension() returns the extension
 * 
 * 
 * FS.Collection Server Tests
 * 
 * Make sure options.filter is respected
 * 
 * 
 */


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