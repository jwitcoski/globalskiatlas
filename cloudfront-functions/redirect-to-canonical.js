/**
 * CloudFront Function: redirect to canonical URL (viewer request).
 *
 * 301 redirects:
 * 1. www.globalskiatlas.com → globalskiatlas.com (same path and query)
 * 2. /index.html → / (and /foo/index.html → /foo/) so the bare path is canonical
 *
 * Attach to your CloudFront distribution's default cache behavior as "Viewer request".
 * Publish the function in the console, then associate it with the behavior.
 */
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var host = (headers.host && headers.host.value) ? headers.host.value : '';
  var uri = request.uri || '/';
  var qs = request.querystring || {};
  var canonicalHost = 'globalskiatlas.com';

  function queryString() {
    var parts = [];
    for (var key in qs) {
      if (Object.prototype.hasOwnProperty.call(qs, key) && qs[key].value !== undefined) {
        if (parts.length) parts.push('&');
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(qs[key].value));
      }
    }
    return parts.length ? '?' + parts.join('') : '';
  }

  var needRedirect = false;
  var newPath = uri;

  // 1. Strip www → canonical host
  if (host.toLowerCase().indexOf('www.') === 0) {
    needRedirect = true;
  }

  // 2. /index.html → / (or /foo/index.html → /foo/)
  if (uri === '/index.html' || (uri.length >= 11 && uri.slice(-11) === 'index.html')) {
    needRedirect = true;
    if (uri === '/index.html') {
      newPath = '/';
    } else {
      newPath = uri.slice(0, -11) || '/';
    }
  }

  if (needRedirect) {
    var location = 'https://' + canonicalHost + newPath + queryString();
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: location } }
    };
  }

  return request;
}
