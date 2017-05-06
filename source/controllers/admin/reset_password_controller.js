'use strict';

module.exports = {

  //
  // Renders the password reset page.
  //
  view: (req, res) => {
    const I18n = req.app.locals.I18n;

    // Render the template
    res.render('admin/reset_password', {
      meta: {
        bodyClass: 'reset-password no-menu',
        title: I18n.term('reset_your_password')
      },
      scripts: ['/assets/js/reset_password.bundle.js'],
      styles: ['/assets/css/reset_password.css']
    });
  }

};
