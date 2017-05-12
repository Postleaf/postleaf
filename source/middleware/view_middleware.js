'use strict';

// Node modules
const HttpCodes = require('http-codes');

module.exports = {

  //
  // Attaches view data to res.locals so it becomes available to views and helpers.
  //
  attachViewData: (req, res, next) => {
    // Request data
    res.locals.Request = {
      body: req.body,
      cookies: req.cookies,
      host: req.get('Host'),
      hostname: req.hostname,
      isHomepage: req.path === '/',
      path: req.path,
      query: req.query,
      secure: req.secure,
      url: req.originalUrl
    };

    next();
  },

  //
  // Serves a Not Found error for routes ending in /page/1 since it would create duplicate content.
  //
  checkPageNumbers: (req, res, next) => {
    if(req.params.page && parseInt(req.params.page) <= 1) {
      res.status(HttpCodes.NOT_FOUND);
      throw new Error('Page Not Found');
    }

    next();
  }

};
