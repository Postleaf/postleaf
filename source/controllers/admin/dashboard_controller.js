'use strict';

// Node modules
const Path = require('path');

module.exports = {

  //
  // Reserved for future use. Currently redirects to posts.
  //
  view: (req, res) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);

    res.redirect(MakeUrl.admin('posts'));
  }

};
