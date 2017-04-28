'use strict';

// Node modules
const Path = require('path');
const Promise = require('bluebird');

// Local modules
const AdminMenu = require(Path.join(__basedir, 'source/modules/admin_menu.js'));

module.exports = {

  //
  // Renders the users page.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;

    // Fetch users
    Promise.resolve()
      .then(() => {
        return models.user
          .findAll({
            order: [
              ['name', 'ASC']
            ]
          });
      })
      .then((users) => {
        // Render the template
        res.useSystemViews().render('users', {
          adminMenu: AdminMenu.getItems(req),
          meta: {
            bodyClass: 'users',
            title: I18n.term('users')
          },
          users: users,
          scripts: ['/assets/js/users.bundle.js'],
          styles: ['/assets/css/users.css']
        });
      })
      .catch((err) => next(err));
  }

};
