'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Path = require('path');

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
      throw new Error('Not Found');
    }

    next();
  },

  //
  // Extends the response object with useThemeViews() and useSystemViews() so you can adjust the
  // view path before rending a template.
  //
  enableDynamicViews: (req, res, next) => {
    // Use the current theme's templates
    res.useThemeViews = () => {
      let theme = req.app.locals.Settings.theme;
      req.app.set('views', Path.join(__basedir, 'themes', theme, 'templates'));
      return res;
    };

    // Use the systems templates in source/views
    res.useSystemViews = () => {
      req.app.set('views', Path.join(__basedir, 'source/views'));
      return res;
    };

    next();
  }

};
