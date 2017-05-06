'use strict';

module.exports = {

  //
  // Renders the login page.
  //
  view: (req, res) => {
    const I18n = req.app.locals.I18n;

    // Render the template
    res.render('admin/login', {
      meta: {
        bodyClass: 'login no-menu',
        title: I18n.term('login')
      },
      scripts: ['/assets/js/login.bundle.js'],
      styles: ['/assets/css/login.css']
    });
  }

};
