'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Promise = require('bluebird');

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
      // Insert new items in the correct order
      .then(() => {
        return Promise.each(navigation, (item) => {
          return models.navigation.create({
            label: item.label,
            link: item.link
          });
        });
      })
      // Update locals
      .then(() => req.app.locals.Navigation = navigation)
      // Send a response
      .then(() => {
        res.json({
          navigation: navigation
        });
      })
      .catch(() => {
        res.status(HttpCodes.INTERNAL_SERVER_ERROR);
        return next(I18n.term('your_changes_could_not_be_saved_at_this_time'));
      });
  }

};
