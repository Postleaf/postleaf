'use strict';

// Node modules
const Extend = require('extend');
const HttpCodes = require('http-codes');
const Path = require('path');
const Promise = require('bluebird');

module.exports = {

  //
  // Gets all settings.
  //
  // Returns a JSON response:
  //
  //  { settings: {} }
  //
  index: (req, res) => {
    res.json({
      settings: req.app.locals.Settings
    });
  },

  //
  // Updates one or more settings.
  //
  //  title (string) - The website's title.
  //  tagline (string) - The website's tagline.
  //  homepage (string) - A post slug to use as the custom homepage.
  //  posts-per-page (int) - The number of posts to display per page.
  //  cover (string) - A relative or absolute URL for the website's cover photo.
  //  logo (string) - A relative or absolute URL for the website's logo.
  //  favicon (string) - A relative or absolute URL for the website's favicon.
  //  theme (string) - A valid theme ID.
  //  language (string) - A valid language code.
  //  time-zone (string) - A valid time zone identifier per moment.js.
  //  default-post-title (string) - The default title to use for posts.
  //  default-post-content (string) - The default content to use for posts.
  //  head-code (string) - Code to inject into {@head/}.
  //  foot-code (string) - Code to inject into {@foot/}.
  //
  // Returns a JSON response:
  //
  //  { settings: {} }
  //
  update: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;
    let settings = Extend(true, {}, req.app.locals.Settings);

    // Website
    if(typeof req.body.title !== 'undefined') settings.title = req.body.title;
    if(typeof req.body.tagline !== 'undefined') settings.tagline = req.body.tagline;
    if(typeof req.body['homepage'] !== 'undefined') {
      settings.homepage = req.body['homepage'] || null;
    }
    if(typeof req.body['posts-per-page'] !== 'undefined') {
      settings.postsPerPage = parseInt(req.body['posts-per-page']) || 10;
    }
    if(typeof req.body.cover !== 'undefined') settings.cover = req.body.cover;
    if(typeof req.body.logo !== 'undefined') settings.logo = req.body.logo;
    if(typeof req.body.favicon !== 'undefined') settings.favicon = req.body.favicon;

    // Theme
    if(typeof req.body.theme !== 'undefined') settings.theme = req.body.theme;

    // Preferences
    if(typeof req.body.language !== 'undefined') settings.language = req.body.language;
    if(typeof req.body['time-zone'] !== 'undefined') settings.timeZone = req.body['time-zone'];

    // Advanced
    if(typeof req.body['default-post-title'] !== 'undefined') {
      settings.defaultPostTitle = req.body['default-post-title'];
    }
    if(typeof req.body['default-post-content'] !== 'undefined') {
      settings.defaultPostContent = req.body['default-post-content'];
    }
    if(typeof req.body['head-code'] !== 'undefined') settings.headCode = req.body['head-code'];
    if(typeof req.body['foot-code'] !== 'undefined') settings.footCode = req.body['foot-code'];

    // Update the database
    let queue = [];
    for(let key in settings) {
      queue.push(models.setting.upsert({ key: key, value: settings[key] }));
    }

    // Wait for all rows to update
    Promise.all(queue)
      // Update locals
      .then(() => req.app.locals.Settings = settings)
      // Update view folders
      .then(() => {
        req.app.set('views', [
          Path.join(__basedir, 'themes', settings.theme, 'templates'),
          Path.join(__basedir, 'source/views')
        ]);
      })
      // Reload i18n
      .then(() => I18n.load(settings.language))
      // Send the response
      .then(() => {
        res.json({
          settings: settings
        });
      })
      .catch(() => {
        res.status(HttpCodes.INTERNAL_SERVER_ERROR);
        return next(I18n.term('your_changes_could_not_be_saved_at_this_time'));
      });
  }

};
