'use strict';

const HttpCodes = require('http-codes');

module.exports = {

  //
  // Gets all navigation menu items.
  //
  // Returns a JSON response:
  //
  //  { navigation: [] }
  //
  index: (req, res) => {
    res.json({
      navigation: req.app.locals.Navigation
    });
  },

  //
  // Updates the navigation menu.
  //
  //  navigation* (array) - An arry of { label: link } objects.
  //
  // Returns a JSON response:
  //
  //  { navigation: {} }
  //
  update: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;
    let navigation = req.body.navigation || [];

    // Remove existing items
    models.navigation.destroy({ truncate: true })
      .then(() => {
        // Insert new items
        let queue = [];
        for(let i = 0; i < navigation.length; i++) {
          queue.push(models.navigation.create({
            label: navigation[i].label,
            link: navigation[i].link
          }));
        }

        // Wait for all rows to update
        Promise.all(queue)
          .then(() => {
            // Update locals
            req.app.locals.Navigation = navigation;

            res.json({
              navigation: navigation
            });
          })
          .catch(() => {
            res.status(HttpCodes.INTERNAL_SERVER_ERROR);
            return next(I18n.term('your_changes_could_not_be_saved_at_this_time'));
          });
      })
      .catch((err) => next(err));
  }

};
