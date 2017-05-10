'use strict';

// Node modules
const Crypto = require('crypto');
const Fs = require('fs');
const HttpCodes = require('http-codes');
const Path = require('path');
const Promise = require('bluebird');

// Local modules
const Email = require(Path.join(__basedir, 'source/modules/email.js'));

//
// Handles the validation error response for create and update
//
function handleErrorResponse(req, res, err) {
  const I18n = req.app.locals.I18n;

  // Unique constraint error
  if(err.name === 'SequelizeUniqueConstraintError') {
    let message = I18n.term('this_field_is_invalid');

    // Custom message based on field
    if(err.fields.includes('username')) {
      message = I18n.term('this_username_is_already_in_use');
    } else if(err.fields.includes('email')) {
      message = I18n.term('this_email_address_is_already_in_use');
    }

    return res.status(HttpCodes.BAD_REQUEST).json({
      message: message,
      invalid: err.fields
    });
  }

  // Validation error
  if(err.name === 'SequelizeValidationError') {
    // Only report one validation error at a time
    return res.status(HttpCodes.BAD_REQUEST).json({
      message: I18n.term(err.errors[0].message),
      invalid: [err.errors[0].path]
    });
  }

  // Other
  return res.status(HttpCodes.BAD_REQUEST).json({
    message: I18n.term('your_changes_could_not_be_saved_at_this_time'),
    invalid: []
  });
}

module.exports = {

  //
  // Gets a list of users.
  //
  //  search (string) - Filter users by search (default null).
  //  count (int) - The number of users to return (default 100).
  //  offset (int) - The offset to return users from (default 0).
  //  render (string) - Set to 'userCards' to return the rendered HTML from
  //    `admin/partials/user_cards.dust`.
  //
  // Returns a JSON response:
  //
  //  { totalItems: 100, users: [] }
  //  { totalItems: 100, users: [], html: '' }
  //
  index: function(req, res, next) {
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let count = parseInt(req.query.count) || 100;
    let offset = parseInt(req.query.offset) || 0;
    let fetch;

    if(req.query.search) {
      // Search
      fetch = models.user.search(req.query.search, {
        limit: count,
        offset: offset
      });
    } else {
      // No search
      fetch = models.user
        .findAndCountAll({
          limit: count,
          offset: offset,
          order: [
            sequelize.fn('lower', sequelize.col('name'))
          ]
        });
    }

    // Fetch users
    fetch
      .then((result) => {
        return new Promise((resolve) => {
          // Render the user cards and return the users
          if(req.query.render === 'userCards') {
            // Render the partial
            res.app.render('admin/partials/user_cards', {
              users: result.rows
            }, (err, html) => {
              if(err) throw new Error(err);

              resolve({
                totalItems: result.count,
                users: result.rows,
                html: html
              });
            });

            return;
          }

          // Just return the users
          resolve({
            totalItems: result.count,
            users: result.rows
          });
        });
      })
      .then((json) => res.json(json))
      .catch((err) => next(err));
  },

  //
  // Creates a user.
  //
  //  name* (string) - The user's name.
  //  email* (string) - The user's email.
  //  username* (string) - The user's username.
  //  password (string) - The user's password. If omitted, a random password will be generated.
  //  role (string) - The user's role. Either 'admin', 'editor', or 'contributor'.
  //  website (string) - The user's website.
  //  location (string) - The user's location.
  //  bio (string) - The user's bio.
  //  avatar (string) - The user's avatar URL.
  //  image (string) - The user's cover image URL.
  //
  // Note: don't set a password for this method. When a new user is created, a random password is
  //   set and an invitation email will be sent to the user with a secure link to login.
  //
  // Returns a JSON response:
  //
  //  { user: {} }
  //  { message: '', invalid: [] }
  //
  create: function(req, res, next) {
    const I18n = req.app.locals.I18n;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const models = req.app.locals.Database.sequelize.models;

    // The owner role can't be duplicated or reassigned
    if(req.body.role === 'owner') {
      res.status(HttpCodes.UNAUTHORIZED);
      return next('Unauthorized');
    }

    // Generate a password if one wasn't set
    if(typeof req.body.password === 'undefined') {
      req.body.password = Crypto.randomBytes(8).toString('hex');
    }

    // Verify password length
    if(req.body.password.length < 8) {
      return res.status(HttpCodes.BAD_REQUEST).json({
        message: I18n.term('passwords_need_to_be_at_least_eight_characters_long'),
        invalid: ['password']
      });
    }

    // Create the user
    models.user
      .create({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        password: models.user.hashPassword(req.body.password),
        role: req.body.role,
        website: req.body.website,
        location: req.body.location,
        bio: req.body.bio,
        avatar: req.body.avatar,
        image: req.body.image
      })
      // Send an invitation email
      .then((user) => {
        let message = Fs.readFileSync(Path.join(__basedir, 'source/emails/invitation.txt'), { encoding: 'utf8' });
        let adminUrl = MakeUrl.admin('users/edit/' + user.id, { absolute: true });

        return Email
          .send({
            to: {
              name: user.name,
              email: user.email
            },
            subject: I18n.term('welcome_to_postleaf'),
            message: { text: message },
            placeholders: {
              name: user.name,
              welcomeToPostleaf: I18n.term('welcome_to_postleaf'),
              yourUsernameIs: I18n.term('your_username_is_[username]', { placeholders: { username: user.username } }),
              yourPasswordIs: I18n.term('your_temporary_password_is_[password]', { placeholders: { password: req.body.password }}),
              followTheLinkBelow: I18n.term('follow_the_link_below_to_login_to_your_account'),
              adminUrl: adminUrl,
              changeYourPassword: I18n.term('dont_forget_to_change_your_password_the_first_time_you_login'),
              websiteTitle: req.app.locals.Settings.title,
              websiteUrl: MakeUrl.raw('', { absolute: true })
            }
          })
          // Send the response
          .then(() => {
            res.json({
              user: user
            });
          })
          .catch(() => {
            res.status(HttpCodes.INTERNAL_SERVER_ERROR);
            return next(I18n.term('sorry_but_i_cant_seem_to_send_an_email_at_the_moment'));
          });
      })
      .catch((err) => handleErrorResponse(req, res, err));
  },

  //
  // Gets a user.
  //
  // Returns a JSON response:
  //
  //  { user: {} }
  //
  read: function(req, res, next) {
    const models = req.app.locals.Database.sequelize.models;

    models.user
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((user) => {
        // Not found
        if(!user) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('User Not Found');
        }

        res.json({
          user: user
        });
      })
      .catch((err) => next(err));
  },

  //
  // Updates a user.
  //
  //  name (string) - The user's name.
  //  email (string) - The user's email.
  //  username (string) - The user's username.
  //  password (string) - The user's new password.
  //  website (string) - The user's website.
  //  location (string) - The user's location.
  //  bio (string) - The user's bio.
  //  avatar (string) - The user's avatar URL.
  //  image (string) - The user's cover image URL.
  //
  // Returns a JSON response:
  //
  //  { user: {} }
  //  { message: '', invalid: [] }
  //
  // If the current user is updating their own password, the X-Auth-Token header will contain a new
  // auth token since the old one will no longer work. In supportive clients, the authToken cookie
  // will be set.
  //
  update: function(req, res) {
    const I18n = req.app.locals.I18n;
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    models.user
      // Fetch the user
      .findOne({
        where: {
          id: req.params.id
        }
      })
      // Update the user
      .then((user) => {
        // Not found
        if(!user) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('User Not Found');
        }

        // The owner role can't be duplicated or reassigned
        if(req.body.role === 'owner' && User.role !== 'owner') {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Is the target user the owner?
        if(user.role === 'owner') {
          // The owner role can't be revoked
          if(typeof req.body.role !== 'undefined' && req.body.role !== 'owner') {
            res.status(HttpCodes.UNAUTHORIZED);
            throw new Error('Unauthorized');
          }
        }

        // Set fields
        if(typeof req.body.name !== 'undefined') user.name = req.body.name;
        if(typeof req.body.email !== 'undefined') user.email = req.body.email;
        if(typeof req.body.username !== 'undefined') user.username = req.body.username;
        if(typeof req.body.password !== 'undefined' && req.body.password !== '') {
          if(req.body.password.length < 8) {
            return res.status(HttpCodes.BAD_REQUEST).json({
              message: I18n.term('passwords_need_to_be_at_least_eight_characters_long'),
              invalid: ['password']
            });
          }

          // Change the password
          user.setPassword(req.body.password);

          // Update auth token since the hash will change
          if(User.id === req.params.id) {
            let authToken = user.generateAuthToken();

            // Set a header with the new auth token
            res.set('X-Auth-Token', authToken);

            // Set a cookie for supportive clients
            res.cookie('authToken', authToken.token, {
              path: '/',
              expires: authToken.expires
            });
          }
        }
        if(typeof req.body.role !== 'undefined') user.role = req.body.role;
        if(typeof req.body.website !== 'undefined') user.website = req.body.website;
        if(typeof req.body.location !== 'undefined') user.location = req.body.location;
        if(typeof req.body.bio !== 'undefined') user.bio = req.body.bio;
        if(typeof req.body.avatar !== 'undefined') user.avatar = req.body.avatar;
        if(typeof req.body.image !== 'undefined') user.image = req.body.image;

        return user.save();
      })
      // Send the response
      .then((user) => {
        res.json({
          user: user
        });
      })
      .catch((err) => handleErrorResponse(req, res, err));
  },

  //
  // Deletes a user
  //
  //  id* (srting) - A user id.
  //
  // Returns a JSON response:
  //
  //  { deleted: true }
  //
  delete: function(req, res, next) {
    const models = req.app.locals.Database.sequelize.models;

    // Fetch the user
    models.user
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((user) => {
        // Not found
        if(!user) {
          if(!user) {
            res.status(HttpCodes.NOT_FOUND);
            throw new Error('User Not Found');
          }
        }

        // The owner can't be deleted
        if(user.role === 'owner') {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Delete the user
        return user.destroy();
      })
      .then(() => res.json({ deleted: true }))
      .catch((err) => next(err.message));
  }

};
