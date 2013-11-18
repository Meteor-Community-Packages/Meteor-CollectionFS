function equals(a, b) {
  return !!(EJSON.stringify(a) === EJSON.stringify(b));
}

Tinytest.add('CollectionFS - client - test environment', function(test) {
  test.isTrue(typeof CollectionFS !== 'undefined', 'test environment not initialized CollectionFS');
  test.isTrue(typeof CFSErrorType !== 'undefined', 'test environment not initialized CFSErrorType');
});

/*
 * FileObject Client Tests
 * 
 * construct FO with no arguments
 * construct FO passing in File (this also tests FO.loadBlob)
 * construct FO passing in Blob (this also tests FO.loadBlob)
 * load blob into FO and then call FO.toDataUrl 
 * call FO.loadBinary and make sure it sets FO.blob properly
 * load blob into FO and then call FO.toBinary; make sure correct data is returned
 * load blob into FO and then call FO.getBytes
 * construct FO, set FO.collectionName to a CFS name, and then test FO.update/remove/get/put/del/url
 * set FO.name to a filename and test that FO.getExtension() returns the extension
 * load blob into FO and make sure FO.saveLocal initiates a download (possibly can't do automatically)
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