'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Moment = require('moment');
const Path = require('path');

// Local modules
const Markdown = require(Path.join(__basedir, 'source/modules/markdown.js'));
const Paginate = require(Path.join(__basedir, 'source/modules/paginate.js'));

module.exports = {

  //
  // Renders a tag page.
  //
  view: (req, res, next) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    const Settings = req.app.locals.Settings;
    let page = req.params.page || 1;
    let limit = Settings.postsPerPage;
    let offset = limit * (page - 1);
    let tag;

    models.tag
      // Fetch the tag
      .findOne({
        where: {
          slug: req.params.slug
        }
      })
      .then((result) => {
        tag = result;

        if(!tag) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }
      })
      // Fetch posts with this tag
      .then(() => models.postTags.findAndCountAll({
        distinct: true,
        where: {
          tagId: tag.id
        },
        include: [
          {
            model: models.post,
            where: {
              status: 'published',
              isPage: 0,
              publishedAt: { $lt: Moment().utc().toDate() }
            },
            include: [
              {
                model: models.user,
                as: 'author',
                attributes: { exclude: ['password', 'resetToken'] }
              },
              {
                model: models.tag,
                through: { attributes: [] }, // exclude postTags
                where: null // also return posts that don't have tags
              }
            ]
          }
        ],
        limit: limit,
        offset: offset,
        order: [
          sequelize.literal('`post.isSticky` DESC'),
          sequelize.literal('`post.publishedAt` DESC')
        ]
      }))
      // Render the view
      .then((posts) => {
        if(page > 1 && !posts.rows.length) {
          res.status(HttpCodes.NOT_FOUND);
          return next('Page Not Found');
        }

        // Assemble view data
        let pagination = Paginate.get(posts.count, limit, page, (page) => {
          return MakeUrl.tag(tag.slug, { absolute: true, page: page });
        });
        let tagUrl = MakeUrl.tag(tag.slug, { absolute: true });
        let tagImage = tag.image ? MakeUrl.raw(tag.image, { absolute: true }) : null;
        let metaTitle = tag.metaTitle || tag.name;
        let metaDescription = tag.metaDescription || Markdown.toText(tag.description);

        // Render the template
        res.useThemeViews().render('tag', {
          tag: tag,
          posts: posts.rows.map((val) => val.post),
          pagination: pagination,
          meta: {
            title: metaTitle,
            description: metaDescription,
            // JSON linked data
            jsonLD: {
              '@context': 'https://schema.org',
              '@type': 'Series',
              'publisher': Settings.title,
              'url': tagUrl,
              'image': tagImage,
              'name': metaTitle,
              'description': metaDescription
            },
            // Open Graph
            openGraph: {
              'og:type': 'website',
              'og:site_name': Settings.title,
              'og:title': metaTitle,
              'og:description': metaDescription,
              'og:url': tagUrl,
              'og:image': tagImage
            },
            // Twitter Card
            twitterCard: {
              'twitter:card': tag.image ? 'summary_large_image' : 'summary',
              'twitter:site': Settings.twitter ? '@' + Settings.twitter : null,
              'twitter:title': metaTitle,
              'twitter:description': metaDescription,
              'twitter:url': tagUrl,
              'twitter:image': tagImage
            }
          }
        });
      })
      .catch((err) => next(err));

  }

};
