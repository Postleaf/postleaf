'use strict';

// Node modules
const HttpCodes = require('http-codes');

module.exports = {

  //
  // Renders the installation page.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;

    // If the app is installed, pretend the page doesn't exist
    if(req.app.locals.isInstalled) {
      res.status(HttpCodes.NOT_FOUND);
      return next('Page Not Found');
    }

    // Render the template
    res.render('admin/install', {
      meta: {
        bodyClass: 'install no-menu',
        title: I18n.term('welcome_to_postleaf')
      },
      scripts: ['/assets/js/install.bundle.js'],
      styles: ['/assets/css/install.css']
    });
  }

};
