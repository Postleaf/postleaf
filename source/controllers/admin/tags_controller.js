'use strict';

// Node modules
const Promise = require('bluebird');

module.exports = {

  //
  // Renders the tags page.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;

    Promise.resolve()
      // Fetch tags
      .then(() => {
        return models.tag
          .findAll({
            order: [
              sequelize.fn('lower', sequelize.col('name'))
            ]
          });
      })
      .then((tags) => {
        // Render the template
        res.render('admin/tags', {
          meta: {
            bodyClass: 'tags',
            title: I18n.term('tags')
          },
          tags: tags,
          scripts: ['/assets/js/tags.bundle.js'],
          styles: ['/assets/css/tags.css']
        });
      })
      .catch((err) => next(err));
  }

};
