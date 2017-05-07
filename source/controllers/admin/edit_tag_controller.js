'use strict';

// Node modules
const HttpCodes = require('http-codes');

module.exports = {

  //
  // Renders the edit tag page.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;

    let create = typeof req.params.id === 'undefined';

    // Fetch the tag
    models.tag
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((tag) => {
        if(!create && !tag) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }

        // Render the template
        res.render('admin/edit_tag', {
          meta: {
            bodyClass: 'edit-tag',
            title: I18n.term(create ? 'new_tag' : 'edit_tag')
          },
          tag: tag,
          scripts: ['/assets/js/edit_tag.bundle.js'],
          styles: ['/assets/css/edit_tag.css']
        });
      })
      .catch((err) => next(err));
  }

};
