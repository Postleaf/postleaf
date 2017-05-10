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
  // Renders an author page.
  //
  view: (req, res, next) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const Settings = req.app.locals.Settings;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let page = req.params.page || 1;
    let limit = Settings.postsPerPage;
    let offset = limit * (page - 1);
    let author;

    models.user
      // Get the author
      .findOne({
        where: {
          username: req.params.username
        }
      })
      .then((result) => {
        author = result;

        if(!author) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }
      })
      // Get posts by this author
      .then(() => models.post.findAndCountAll({
        distinct: true,
        where: {
          userId: author.id,
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
        ],
        limit: limit,
        offset: offset,
        order: [
          ['isSticky', 'DESC'],
          ['publishedAt', 'DESC'],
          sequelize.fn('lower', sequelize.col('tags.name'))
        ]
      }))
      // Render the view
      .then((posts) => {
        if(page > 1 && !posts.rows.length) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }

        // Assemble view data
        let pagination = Paginate.get(posts.count, limit, page, (page) => {
          return MakeUrl.author(author.username, { absolute: true, page: page });
        });
        let authorUrl = MakeUrl.author(author.username, { absolute: true });
        let authorAvatar = author.avatar ? MakeUrl.raw(author.avatar, { absolute: true }) : null;
        let metaTitle = author.name;
        let metaDescription = Markdown.toText(author.bio);

        // Render the template
        res.render('author', {
          author: author,
          posts: posts.rows,
          pagination: pagination,
          meta: {
            title: metaTitle,
            description: metaDescription,
            // JSON linked data
            jsonLD: {
              '@context': 'https://schema.org',
              '@type': 'Person',
              'name': author.name,
              'description': Markdown.toText(author.bio),
              'url': authorUrl,
              'image': authorAvatar,
              'sameAs': author.website
            },
            // Open Graph
            openGraph: {
              'og:type': 'profile',
              'og:site_name': Settings.title,
              'og:title': metaTitle,
              'og:description': metaDescription,
              'og:url': authorUrl,
              'og:image': authorAvatar
            },
            // Twitter Card
            twitterCard: {
              'twitter:card': author.avatar ? 'summary_large_image' : 'summary',
              'twitter:site': Settings.twitter ? '@' + Settings.twitter : null,
              'twitter:title': metaTitle,
              'twitter:description': metaDescription,
              'twitter:creator': author.twitter ? '@' + author.twitter : null,
              'twitter:url': authorUrl,
              'twitter:image': authorAvatar
            }
          }
        });
      })
      .catch((err) => next(err));
  }

};
