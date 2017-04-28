'use strict';

// Node modules
const Crypto = require('crypto');
const Fs = require('fs');
const HttpCodes = require('http-codes');
const Path = require('path');

// Local modules
const Email = require(Path.join(__basedir, 'source/modules/email.js'));

module.exports = {

  //
  // Handles authentication requests by generating an authentication token for the user.
  //
  //  username* (string) - The username of the user to authenticate.
  //  password* (string) - The user's password.
  //
  // Returns a JSON response:
  //
  //  { authToken: '<token>' }
  //  { message: '', invalid: [] }
  //
  authenticate: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;
    const sequelize = req.app.locals.Database.sequelize;

    // Fetch the user
    models.user
      .findOne({
        where: {
          $or: [
            // Allow case-insensitive usernames
            sequelize.where(
              sequelize.fn('lower', sequelize.col('username')),
              sequelize.fn('lower', req.body.username)
            ),
            // Allow case-insensitive emails
            sequelize.where(
              sequelize.fn('lower', sequelize.col('email')),
              sequelize.fn('lower', req.body.username)
            )
          ]
        }
      })
      .then((user) => {
        // User not found
        if(!user) {
          return res.status(HttpCodes.BAD_REQUEST).json({
            message: I18n.term('invalid_username_or_email_address'),
            invalid: ['username']
          });
        }

        // Verify password
        if(!user.verifyPassword(req.body.password)) {
          return res.status(HttpCodes.BAD_REQUEST).json({
            message: I18n.term('your_password_is_incorrect'),
            invalid: ['password']
          });
        }

        // Generate an auth token
        let authToken = user.generateAuthToken();

        // Set a cookie for supportive clients
        res.cookie('authToken', authToken.token, {
          path: '/',
          expires: authToken.expires
        });

        // Send the response
        res.json({
          authToken: authToken
        });
      })
      .catch((err) => next(err));
  },

  //
  // Generates a reset token and sends a password recovery email.
  //
  //  username* (string) - A valid username.
  //
  // Returns a JSON response:
  //
  //  { message: '' }
  //
  recoverPassword: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const models = req.app.locals.Database.sequelize.models;
    const sequelize = req.app.locals.Database.sequelize;

    // Fetch the user
    models.user
      .findOne({
        where: {
          $or: [
            // Allow case-insensitive usernames
            sequelize.where(
              sequelize.fn('lower', sequelize.col('username')),
              sequelize.fn('lower', req.body.username)
            ),
            // Allow case-insensitive emails
            sequelize.where(
              sequelize.fn('lower', sequelize.col('email')),
              sequelize.fn('lower', req.body.username)
            )
          ]
        }
      })
      .then((user) => {
        // User not found
        if(!user) {
          return res.status(HttpCodes.BAD_REQUEST).json({
            invalid: ['username']
          });
        }

        // Generate reset token and URL
        let message = Fs.readFileSync(Path.join(__basedir, 'source/emails/password_reset.txt'), { encoding: 'utf8' });
        let resetToken = Crypto.randomBytes(32).toString('hex');
        let resetUrl = MakeUrl.admin('login/reset', {
          absolute: true,
          query: {
            id: user.id,
            token: resetToken
          }
        });

        // Set the user's reset token
        user.resetToken = resetToken;
        user.save();

        // Send email
        Email.send({
          to: {
            name: user.name,
            email: user.email
          },
          subject: I18n.term('postleaf_account_recovery_message'),
          message: { text: message },
          placeholders: {
            name: user.name,
            forgotYourPassword: I18n.term('forgot_your_password_it_happens_sometimes'),
            followThisLink: I18n.term('just_follow_this_link_and_youll_be_publishing_again'),
            resetUrl: resetUrl,
            websiteUrl: MakeUrl.raw('', { absolute: true }),
            websiteTitle: req.app.locals.Settings.title
          }
        })
          .then(() => {
            // Send the response
            res.json({
              message: I18n.term('please_check_your_email_for_further_instructions')
            });
          })
          .catch(() => {
            res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
              message: I18n.term('sorry_but_i_cant_seem_to_send_an_email_at_the_moment')
            });
          });
      })
      .catch((err) => next(err));
  },

  //
  // Resets a user's password.
  //
  //  resetToken* (string) - A valid reset token.
  //  password* (string) - The new password.
  //
  // Returns a JSON response:
  //
  //  { message: '' }
  //  { message: '', invalid: [] }
  //
  resetPassword: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;
    let password = req.body.password || '';

    // Fetch the user
    models.user
      .findOne({
        where: {
          id: req.body.id,
          resetToken: req.body.token
        }
      })
      .then((user) => {
        // User not found or invalid reset token
        if(!user) {
          return res.status(HttpCodes.BAD_REQUEST).json({
            message: I18n.term('the_link_you_followed_is_no_longer_valid')
          });
        }

        // Check password length
        if(password.length < 8) {
          return res.status(HttpCodes.BAD_REQUEST).json({
            invalid: ['password'],
            message: I18n.term('passwords_need_to_be_at_least_eight_characters_long')
          });
        }

        // Reset the password
        user.setPassword(password);
        user.resetToken = null;
        user.save();

        return res.json({
          message: I18n.term('your_password_has_been_reset')
        });
      })
      .catch((err) => next(err));
  }

};
