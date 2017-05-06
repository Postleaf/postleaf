'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Moment = require('moment');
const Path = require('path');

// Local modules
const Paginate = require(Path.join(__basedir, 'source/modules/paginate.js'));

module.exports = {

  //
  // Renders the search page.
  //
  view: (req, res, next) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    const Settings = req.app.locals.Settings;
    let page = req.params.page || 1;
    let limit = Settings.postsPerPage;
    let offset = limit * (page - 1);

    models.post
      // Fetch search results
      .search(req.query.s, {
        where: {
          status: 'published',
          isPage: 0,
          publishedAt: { $lt: Moment().utc().toDate() }
        },
        limit: limit,
        offset: offset
      })
      // Render the view
      .then((posts) => {
        if(page > 1 && !posts.rows.length) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }

        // Assemble view data
        let pagination = Paginate.get(posts.count, limit, page, (page) => {
          return MakeUrl.search(req.query.s, { absolute: true, page: page });
        });
        let websiteImage = Settings.cover ? MakeUrl.raw(Settings.cover, { absolute: true }) : null;
        let websiteUrl = MakeUrl.raw({ absolute: true });

        // Render the template
        res.render('search', {
          query: req.query.s,
          posts: posts.rows,
          pagination: pagination,
          meta: {
            title: Settings.title,
            description: Settings.tagline,
            // JSON linked data
            jsonLD: {
              '@context': 'https://schema.org',
              '@type': 'Website',
              'publisher': Settings.title,
              'url': websiteUrl,
              'image': websiteImage,
              'description': Settings.tagline
            },
            // Open Graph
            openGraph: {
              'og:type': 'website',
              'og:site_name': Settings.title,
              'og:title': Settings.title,
              'og:description': Settings.tagline,
              'og:url': websiteUrl,
              'og:image': websiteImage
            },
            // Twitter Card
            twitterCard: {
              'twitter:card': Settings.cover ? 'summary_large_image' : 'summary',
              'twitter:site': Settings.twitter ? '@' + Settings.twitter : null,
              'twitter:title': Settings.title,
              'twitter:description': Settings.tagline,
              'twitter:url': websiteUrl,
              'twitter:image': websiteImage
            }
          }
        });
      })
      .catch((err) => next(err));
  }

};
