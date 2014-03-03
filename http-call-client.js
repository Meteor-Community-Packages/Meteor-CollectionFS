/* 
 * We use this instead of HTTP.call from the http package for now. If/when
 * PR 1670 is merged and released, we can probably remove this file and begin
 * using HTTP.call directly.
 */

httpCall = function(method, url, options, callback) {

  ////////// Process arguments //////////

  if (! callback && typeof options === "function") {
    // support (method, url, callback) argument list
    callback = options;
    options = null;
  }

  options = options || {};

  if (typeof callback !== "function")
    throw new Error(
      "Can't make a blocking HTTP call from the client; callback required.");

  method = (method || "").toUpperCase();

  var headers = {};

  var content = options.content;
  if (options.data) {
    content = JSON.stringify(options.data);
    headers['Content-Type'] = 'application/json';
  }

  var params_for_url, params_for_body;
  if (content || method === "GET" || method === "HEAD")
    params_for_url = options.params;
  else
    params_for_body = options.params;

  var query_match = /^(.*?)(\?.*)?$/.exec(url);
  url = buildUrl(query_match[1], query_match[2],
                 options.query, params_for_url);

  if (options.followRedirects === false)
    throw new Error("Option followRedirects:false not supported on client.");

  var username, password;
  if (options.auth) {
    var colonLoc = options.auth.indexOf(':');
    if (colonLoc < 0)
      throw new Error('auth option should be of the form "username:password"');
    username = options.auth.substring(0, colonLoc);
    password = options.auth.substring(colonLoc+1);
  }

  if (params_for_body) {
    content = encodeParams(params_for_body);
  }

  _.extend(headers, options.headers || {});

  ////////// Callback wrapping //////////

  // wrap callback to add a 'response' property on an error, in case
  // we have both (http 4xx/5xx error, which has a response payload)
  callback = (function(callback) {
    return function(error, response) {
      if (error && response)
        error.response = response;
      callback(error, response);
    };
  })(callback);

  // safety belt: only call the callback once.
  callback = _.once(callback);


  ////////// Kickoff! //////////

  // from this point on, errors are because of something remote, not
  // something we should check in advance. Turn exceptions into error
  // results.
  try {
    // setup XHR object
    var xhr;
    if (typeof XMLHttpRequest !== "undefined")
      xhr = new XMLHttpRequest();
    else if (typeof ActiveXObject !== "undefined")
      xhr = new ActiveXObject("Microsoft.XMLHttp"); // IE6
    else
      throw new Error("Can't create XMLHttpRequest"); // ???

    xhr.open(method, url, true, username, password);
    
    // support custom "ejson-binary" response type
    // and all browser-supported types
    var convertToBinary;
    if (options.responseType === "ejson-binary") {
      xhr.responseType = "arraybuffer";
      convertToBinary = true;
    } else {
      xhr.responseType = options.responseType;
    }

    for (var k in headers)
      xhr.setRequestHeader(k, headers[k]);


    // setup timeout
    var timed_out = false;
    var timer;
    if (options.timeout) {
      timer = Meteor.setTimeout(function() {
        timed_out = true;
        xhr.abort();
      }, options.timeout);
    };

    // callback on complete
    xhr.onreadystatechange = function(evt) {
      if (xhr.readyState === 4) { // COMPLETE
        if (timer)
          Meteor.clearTimeout(timer);

        if (timed_out) {
          callback(new Error("timeout"));
        } else if (! xhr.status) {
          // no HTTP response
          callback(new Error("network"));
        } else {

          var response = {};
          response.statusCode = xhr.status;
          
          var body = xhr.response || xhr.responseText;
          
          // Some browsers don't yet support "json" responseType,
          // but we can replicate it
          if (options.responseType === "json" && typeof body === "string") {
            try {
              body = JSON.parse(body);
            } catch (err) {
              body = null;
            }
          }
          
          // Add support for a custom responseType: "ejson-binary"
          if (convertToBinary && typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined" && body instanceof ArrayBuffer) {
            var view = new Uint8Array(body);
            var len = body.byteLength;
            var binaryBody = EJSON.newBinary(len);
            for (var i = 0; i < len; i++) {
              binaryBody[i] = view[i];
            }
            body = binaryBody;
          }
          
          response.content = body;

          response.headers = {};
          var header_str = xhr.getAllResponseHeaders();

          // https://github.com/meteor/meteor/issues/553
          //
          // In Firefox there is a weird issue, sometimes
          // getAllResponseHeaders returns the empty string, but
          // getResponseHeader returns correct results. Possibly this
          // issue:
          // https://bugzilla.mozilla.org/show_bug.cgi?id=608735
          //
          // If this happens we can't get a full list of headers, but
          // at least get content-type so our JSON decoding happens
          // correctly. In theory, we could try and rescue more header
          // values with a list of common headers, but content-type is
          // the only vital one for now.
          if ("" === header_str && xhr.getResponseHeader("content-type"))
            header_str =
            "content-type: " + xhr.getResponseHeader("content-type");

          var headers_raw = header_str.split(/\r?\n/);
          _.each(headers_raw, function (h) {
            var m = /^(.*?):(?:\s+)(.*)$/.exec(h);
            if (m && m.length === 3)
              response.headers[m[1].toLowerCase()] = m[2];
          });

          populateData(response);

          var error = null;
          if (response.statusCode >= 400)
            error = makeErrorByStatus(response.statusCode, response.content);

          callback(error, response);
        }
      }
    };

    // send it on its way
    xhr.send(content);

  } catch (err) {
    callback(err);
  }

};

buildUrl = function(before_qmark, from_qmark, opt_query, opt_params) {
  var url_without_query = before_qmark;
  var query = from_qmark ? from_qmark.slice(1) : null;

  if (typeof opt_query === "string")
    query = String(opt_query);

  if (opt_params) {
    query = query || "";
    var prms = encodeParams(opt_params);
    if (query && prms)
      query += '&';
    query += prms;
  }

  var url = url_without_query;
  if (query !== null)
    url += ("?"+query);

  return url;
};

encodeParams = function(params) {
  var buf = [];
  _.each(params, function(value, key) {
    if (buf.length)
      buf.push('&');
    buf.push(encodeString(key), '=', encodeString(value));
  });
  return buf.join('').replace(/%20/g, '+');
};

encodeString = function(str) {
  return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
};

makeErrorByStatus = function(statusCode, content) {
  var MAX_LENGTH = 160; // if you change this, also change the appropriate test

  var truncate = function(str, length) {
    return str.length > length ? str.slice(0, length) + '...' : str;
  };

  var message = "failed [" + statusCode + "]";
  if (content)
    message += " " + truncate(content.replace(/\n/g, " "), MAX_LENGTH);

  return new Error(message);
};

// Fill in `response.data` if the content-type is JSON.
populateData = function(response) {
  // Read Content-Type header, up to a ';' if there is one.
  // A typical header might be "application/json; charset=utf-8"
  // or just "application/json".
  var contentType = (response.headers['content-type'] || ';').split(';')[0];

  // Only try to parse data as JSON if server sets correct content type.
  if (_.include(['application/json', 'text/javascript'], contentType)) {
    try {
      response.data = JSON.parse(response.content);
    } catch (err) {
      response.data = null;
    }
  } else {
    response.data = null;
  }
};