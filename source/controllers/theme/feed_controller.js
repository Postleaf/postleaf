'use strict';

// Node modules
const Cheerio = require('cheerio');
const Moment = require('moment');
const Path = require('path');

// Local modules
const DynamicImages = require(Path.join(__basedir, 'source/modules/dynamic_images.js'));

module.exports = {

  //
  // Renders the RSS feed.
  //
  view: (req, res, next) => {
    const Settings = req.app.locals.Settings;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(Settings);
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let format = req.params.format;

    // Check for a valid feed format
    if(format !== 'json' && format !== 'rss') {
      return next();
    }

    // Fetch posts and associated data
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
          sequelize.fn('lower', sequelize.col('tags.name'))
        ],
        limit: 100
      })
      // Convert relative URLs to absolute URLs since most aggregators prefer them
      .then((posts) => {
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

        return posts;
      })
      // Render the appropriate feed
      .then((posts) => {
        let favicon = MakeUrl.raw(Settings.favicon, { absolute: true });

        switch(format) {
        // JSON feed
        case 'json':
          res.json({
            version: 'https://jsonfeed.org/version/1',
            title: Settings.title,
            home_page_url: MakeUrl.raw({ absolute: true }),
            feed_url: MakeUrl.feed({ format: 'json', absolute: true }),
            description: Settings.tagline,
            icon: DynamicImages.generateUrl(favicon, { thumbnail: 512 }),
            favicon: DynamicImages.generateUrl(favicon, { thumbnail: 128 }),
            items: posts.map((post) => {
              return {
                id: post.id,
                url: MakeUrl.post(post.slug, { absolute: true }),
                title: post.title,
                content_html: post.content,
                image: post.image ? MakeUrl.raw(post.image, { absolute: true }) : undefined,
                date_published: Moment(post.publishedAt).tz(Settings.timeZone).format('YYYY-MM-DDTHH:mm:ssZ'),
                date_modified: Moment(post.updatedAt).tz(Settings.timeZone).format('YYYY-MM-DDTHH:mm:ssZ'),
                author: {
                  name: post.author.name,
                  url: MakeUrl.author(post.author.username, { absolute: true }),
                  avatar: post.author.avatar ? MakeUrl.raw(post.author.avatar, { absolute: true }) : undefined
                },
                tags: post.tags.map((tag) => tag.name)
              };
            })
          });
          break;

        // RSS feed
        default:
          res
            .append('Content-Type', 'application/xml')
            .render('admin/rss_feed', {
              posts: posts
            });
        }
      })
      .catch((err) => next(err));
  }

};
