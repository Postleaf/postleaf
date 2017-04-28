'use strict';

// Node modules
const Path = require('path');

module.exports = {

  //
  // Checks for an owner account.
  //
  checkInstallation: (req, res, next) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const models = req.app.locals.Database.sequelize.models;
    let installUrl = MakeUrl.admin('install');
    let apiUrl = MakeUrl.api('install');

    // If the app is already installed, there's nothing to do
    if(req.app.locals.isInstalled) {
      return next();
    }

    // Make the installation view and API endpoint accessible
    if(req.originalUrl === installUrl || req.originalUrl === apiUrl) {
      return next();
    }

    // Check for an owner account
    models.user
      .findOne({
        where: {
          role: 'owner'
        }
      })
      .then((owner) => {
        // If an owner exists, assume the app is installed
        if(owner) {
          req.app.locals.isInstalled = true;
          return next();
        }

        // If not, send them to the installation page
        res.redirect(installUrl);
      });

  }

};
