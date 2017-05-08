'use strict';

// Node modules
const Path = require('path');

// Local modules
const MetaphorEngine = require(Path.join(__basedir, 'source/modules/metaphor_engine.js'));

module.exports = {

  //
  // Fetches metadata, oEmbed data, and a preview of the given URL.
  //
  // Returns a JSON response with a Metaphor description object.
  //
  // Details: https://github.com/hueniverse/metaphor
  //
  getFromProvider: (req, res) => {
    const engine = MetaphorEngine.create();

    // Fetch metadata and send a response
    engine.describe(req.query.url, (description) => res.json(description));
  }

};
