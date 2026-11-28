/** Assert helpers mirror scripts/gsa-events.js download/local/stay22 rules. */
var assert = require("assert");

function isLocal(host) {
  host = String(host || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

function onDownloadPage(pathname) {
  var path = String(pathname || "").replace(/\/+$/, "") || "/";
  return /DownloadData\.html$/i.test(pathname) || /\/DownloadData$/i.test(path);
}

function isStay22(domain) {
  return domain === "stay22.com" || /\.stay22\.com$/i.test(domain);
}

assert.strictEqual(isLocal("localhost"), true);
assert.strictEqual(isLocal("127.0.0.1"), true);
assert.strictEqual(isLocal("globalskiatlas.com"), false);
assert.strictEqual(onDownloadPage("/DownloadData.html"), true);
assert.strictEqual(onDownloadPage("/DownloadData"), true);
assert.strictEqual(onDownloadPage("/wiki/resort.html"), false);
assert.strictEqual(isStay22("stay22.com"), true);
assert.strictEqual(isStay22("www.stay22.com"), true);
assert.strictEqual(isStay22("example.com"), false);
console.log("gsa-events-check: ok");
