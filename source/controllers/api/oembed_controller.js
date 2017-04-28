'use strict';

// Node modules
const Oembed = require('oembed');

module.exports = {

  //
  // Submits a URL to an oEmbed provider and returns the resulting oEmbed properties. If no provider
  // is found or the URL can't be processed, null is returned.
  //
  // Returns a JSON response:
  //
  //  { embed: {} }
  //  { embed: null }
  //
  getFromProvider: (req, res) => {
    Oembed.fetch(req.query.url, { for: req.hostname }, (err, result) => {
      if(err) {
        return res.json({ embed: null });
      }

      return res.json({ embed: result });
    });
  }

};
