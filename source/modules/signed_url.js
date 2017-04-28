'use strict';

// Node modules
const Crypto = require('crypto');
const Url = require('url');

//
// Converts an object to a query string, sorted alphabetically by key. Sorting alphabetically
// provides a bit of flexibility when generating URLs, as params don't need to be in a specific
// order. It also let us work around the pre-ES2016 issue of objects not having a guarantted order
// when we parse the query string into an object.
//
//  obj (object) - The object to convert.
//
// Returns a string.
//
function objectToQueryString(obj) {
  let query = [];

  Object.keys(obj).forEach((key) => {
    query.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
  });

  return query.sort().join('&');
}

const self = {

  //
  // Generates a key for use with a signed URL.
  //
  //  hostname* (string) - The full URL to generate a key for.
  //  secret* (string) - A cryptographically secure string.
  //
  // Returns a string.
  //
  generateKey: (url, secret) => {
    url = Url.parse(url, true);
    let query = objectToQueryString(url.query);

    return Crypto
      .createHash('sha256')
      .update(secret + url.hostname + url.pathname + query)
      .digest('hex');
  },

  //
  // Generates a key and appends it to the given URL.
  //
  //  url* (string) - The URL to sign.
  //  secret* (string) - A cryptographically secure string.
  //
  // Returns a string.
  //
  sign: (url, secret) => {
    let key = self.generateKey(url, secret);
    let signedUrl = Url.parse(url);

    // Append the key. Note that Url.format() builds the query string from `search`, not `query`.
    signedUrl.search += '&key=' + encodeURIComponent(key);

    return Url.format(signedUrl);
  },

  //
  // Verifies a signed URL.
  //
  //  url* (string) - The full URL to verify.
  //  secret* (string) - The secret used to generate the signed URL.
  //
  // Returns a boolean.
  //
  verify: (url, secret) => {
    url = Url.parse(url, true);
    let query = url.query;
    let key = url.query.key;

    // Remove key from query
    delete url.query.key;
    query = objectToQueryString(query);

    // Rebuild the URL and compare keys. Note that Url.format() builds the query string from `search`, not `query`.
    url.search = '?' + query;

    return key === self.generateKey(Url.format(url), secret);
  }

};

module.exports = self;
