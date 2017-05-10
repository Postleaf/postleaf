'use strict';

// Node modules
const Moment = require('moment');
const Path = require('path');
const Promise = require('bluebird');

// Local modules
const Themes = require(Path.join(__basedir, 'source/modules/themes.js'));

module.exports = {

  //
  // Renders the settings page.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;

    let queue = [];
    let timeZones = [];

    // Get a list of all possible time zones
    Moment.tz.names().map((zone) => {
      timeZones.push({ id: zone, name: zone.replace(/_/g, ' ')});
    });

    // Get themes
    queue.push(Themes.getThemes());

    // Get language packs
    queue.push(I18n.getLanguagePacks());

    // Get all posts that are eligible to use as a custom homepage
    queue.push(
      models.post.findAll({
        attributes: ['id', 'slug', 'title'],
        where: {
          isPage: 1,
          status: 'published',
          publishedAt: { $lt: Moment().utc().toDate() }
        },
        order: [
          sequelize.fn('lower', sequelize.col('title'))
        ]
      })
    );

    // Wait for all queue to resolve
    Promise.all(queue)
      .then((result) => {
        let themes = result[0];
        let languages = result[1];
        let homepagePosts = result[2];

        // Render the template
        res.render('admin/settings', {
          meta: {
            bodyClass: 'settings',
            title: I18n.term('settings')
          },
          homepagePosts: homepagePosts,
          languages: languages,
          themes: themes,
          timeZones: timeZones,
          scripts: ['/assets/js/settings.bundle.js'],
          styles: ['/assets/css/settings.css'],
          uploadAction: MakeUrl.api('uploads')
        });
      })
      .catch((err) => next(err));
  }

};
