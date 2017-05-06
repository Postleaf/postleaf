'use strict';

module.exports = {

  //
  // Renders the password recovery page.
  //
  view: (req, res) => {
    const I18n = req.app.locals.I18n;

    // Render the template
    res.render('admin/recover_password', {
      meta: {
        bodyClass: 'recover-password no-menu',
        title: I18n.term('recover_password')
      },
      scripts: ['/assets/js/recover_password.bundle.js'],
      styles: ['/assets/css/recover_password.css']
    });
  }

};
