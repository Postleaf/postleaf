'use strict';

// Node modules
const Cheerio = require('cheerio');
const Moment = require('moment');
const Path = require('path');

module.exports = {

  //
  // Renders the RSS feed.
  //
  view: (req, res, next) => {
    const models = req.app.locals.Database.sequelize.models;
    const Settings = req.app.locals.Settings;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(Settings);

    // Fetch posts and associated data for feeds
    models.post
      .findAll({
        where: {
          status: 'published',
          publishedAt: { $lt: Moment().utc().toDate() }
        },
        include: [
          {
            model: models.user,
            as: 'author',
            attributes: { exclude: ['password', 'resetToken'] },
            where: req.query.author ? {
              username: {
                $in: req.query.author.split(',')
              }
            } : null
          },
          {
            model: models.tag,
            through: { attributes: [] }, // exclude postTags
            where: null // also return posts that don't have tags
          }
        ],
        order: [
          ['publishedAt', 'DESC'],
          [models.tag, 'name', 'ASC']
        ],
        limit: Settings.postsPerPage
      })
      .then((posts) => {
        let viewData = { posts: posts };

        // Convert relative URLs to absolute URLs since most aggregators prefer them
        for(let i = 0; i < posts.length; i++) {
          let $ = Cheerio.load(posts[i].content);

          // Links
          $('a').each(function() {
            $(this).attr('href', MakeUrl.absolute($(this).attr('href')));
          });

          // Images
          $('img').each(function() {
            $(this).attr('src', MakeUrl.absolute($(this).attr('src')));
          });

          posts[i].content = $.html();
        }

        // Try the custom feed template
        res
          .useThemeViews()
          .append('Content-Type', 'application/xml')
          .render('feed', viewData, (err, html) => {
            if(!err) {
              res.send(html);
            } else {
              // Fallback to system feed template
              res
                .useSystemViews()
                .render('feed', viewData);
            }
          });
      })
      .catch((err) => next(err));
  }

};
