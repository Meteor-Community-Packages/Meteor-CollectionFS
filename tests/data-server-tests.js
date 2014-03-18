FS.debug = true;

// Set up HTTP method URL used by client tests
HTTP.methods({
  'test': {
    get: function () {
      var buf = new Buffer('Hello World');
      this.setContentType('text/plain');
      return buf;
    },
    head: function () {
      var buf = new Buffer('Hello World');
      this.setContentType('text/plain');
      this.addHeader('Content-Length', buf.length);
      buf = null;
    }
  }
});

Tinytest.add('cfs-file - client - test environment', function(test) {
  test.isTrue(typeof FS.Collection !== 'undefined', 'test environment not initialized FS.Collection');
});

// Init with Buffer
// Init with ArrayBuffer
// Init with Binary
// Init with data uri string
// Init with url string
// Init with filepath string

// getBuffer
// getDataUri
// saveToFile
// size

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
