'use strict';

// Node modules
const Path = require('path');

module.exports = {

  //
  // Logs the user out and redirects them to the login page.
  //
  view: (req, res) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);

    // Remove the auth cookie for supportive clients
    res.cookie('authToken', '', { expires: new Date() });

    // Redirect to the login page
    res.redirect(
      MakeUrl.admin('login')
    );
  }

};
