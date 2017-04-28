'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Path = require('path');

module.exports = {

  //
  // Looks for an auth header or cookie and sets req.User and res.locals.User if the token is valid.
  //
  attachUser: (req, res, next) => {
    const models = req.app.locals.Database.sequelize.models;

    // Check for an auth token in headers or cookies and set req.user if the token is valid
    let authToken = req.get('X-Auth-Token') || req.cookies.authToken;

    // Decode the token
    models.user
      .decodeAuthToken(authToken)
      .then((user) => {
        // Attach the user to req and res.locals
        req.User = user;
        res.locals.User = user;

        next();

        // Supress Bluebird warning
        return null;
      })
      // Missing or invalid token, don't attach anything
      .catch(() => next());
  },

  //
  // Forwards authenticated users to the dashboard.
  //
  forwardAuth: (req, res, next) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);

    if(req.User) {
      return res.redirect(MakeUrl.admin());
    }

    next();
  },

  //
  // Requires an authorized user before allowing the request to complete.
  //
  requireAuth: (req, res, next) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);

    if(req.User) return next();

    // XHR requests
    if(req.xhr) {
      res.status(HttpCodes.UNAUTHORIZED);
      return next('Unauthorized');
    }

    // Redirect non-XHR requests to the login page
    res.redirect(
      MakeUrl.admin('login', {
        query: { redirect: req.originalUrl }
      })
    );
  },

  //
  // Requires the authorized user to have a certain role before allowing the request to complete.
  //
  //  role* (string|array) - The role(s) to require.
  //
  requireRole: (role) => {
    return (req, res, next) => {
      if(!Array.isArray(role)) role = [role];

      if(!role.includes(req.User.role)) {
        res.status(HttpCodes.UNAUTHORIZED);
        return next('Unauthorized');
      }

      return next();
    };
  }

};
