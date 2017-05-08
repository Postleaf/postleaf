'use strict';

// Node modules
const Promise = require('bluebird');

module.exports = {

  //
  // Renders the robots.txt page.
  //
  view: (req, res, next) => {
    Promise.resolve()
      .then(() => {
        res.header('Content-Type', 'text/plain').render('robots');
      })
      .catch((err) => next(err));
  }

};
