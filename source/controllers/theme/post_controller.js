'use strict';

// Node modules
const Extend = require('extend');
const Fs = require('fs');
const HttpCodes = require('http-codes');
const Moment = require('moment');
const Path = require('path');
const Striptags = require('striptags');

// Local modules
const DynamicImages = require(Path.join(__basedir, 'source/modules/dynamic_images.js'));
const Markdown = require(Path.join(__basedir, 'source/modules/markdown.js'));

const self = module.exports = {

  //
  // Renders a custom homepage.
  //
  customHomepage: (req, res, next) => {
    // Set custom homepage
    req.params.slug = req.app.locals.Settings.homepage;

    // Render it
    return self.view(req, res, next);
  },

  //
  // Renders a post.
  //
  //  slug* (string) - A post slug.
  //
  view: (req, res, next) => {
    const Settings = req.app.locals.Settings;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(Settings);
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let where = {};

    where.slug = req.params.slug;
    where.status = 'published';
    where.publishedAt = { $lt: Moment().utc().toDate() };

    // Fetch the post, the post's author, and all related tags
    models.post
      .findOne({
        where: where,
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
        order: [
          sequelize.fn('lower', sequelize.col('tags.name'))
        ]
      })
      // Inject srcset attribute for dynamic images
      .then((post) => {
        if(post) {
          return DynamicImages
            .injectSrcset(post.content, models.upload)
            .then((content) => Extend(post, { content: content }));
        }

        return post;
      })
      .then((post) => {
        // Not found
        if(!post) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }

        // Assemble view data
        let logo = Settings.logo ? MakeUrl.raw(Settings.logo, { absolute: true }) : null;
        let postUrl = MakeUrl.post(post.slug, { absolute: true });
        let postImage = post.image ? MakeUrl.raw(post.image, { absolute: true }) : null;
        let postDate = Moment(post.publishedAt).format('YYYY-MM-DD[T]HH:mm:ss[Z]');
        let metaTitle = post.metaTitle || post.title;
        let metaDescription = Striptags(post.metaDescription || post.content).split(' ', 50).join(' ');
        let tags = (post.tags || []).map((val) => { return val.name; }).join(', ');
        let authorBio = Markdown.toText(post.author.bio);
        let authorImage = post.author.avatar ? MakeUrl.raw(post.author.avatar, { absolute: true }) : null;
        let viewData = {
          post: post,
          meta: {
            title: metaTitle,
            description: metaDescription,
            // JSON linked data
            jsonLD: {
              '@context': 'https://schema.org',
              '@type': 'Article',
              'publisher': {
                '@type': 'Organization',
                'name': Settings.title,
                'logo': logo
              },
              'author': {
                '@type': 'Person',
                'name': post.author.name,
                'description': authorBio,
                'image': authorImage,
                'sameAs': post.author.website
              },
              'url': MakeUrl.post(post.slug),
              'headline': metaTitle,
              'description': metaDescription,
              'image': postImage,
              'datePublished': postDate,
              'dateModified': postDate
            },
            // OpenGraph
            openGraph: {
              'og:type': 'article',
              'og:site_name': Settings.title,
              'og:title': metaTitle,
              'og:description': metaDescription,
              'og:url': postUrl,
              'og:image': postImage,
              'article:published_time': postDate,
              'article:modified_time': postDate,
              'article:tag': tags
            },
            // Twitter card
            twitterCard: {
              'twitter:card': postImage ? 'summary_large_image' : 'summary',
              'twitter:site': Settings.twitter ? '@' + Settings.twitter : null,
              'twitter:title': metaTitle,
              'twitter:description': metaDescription,
              'twitter:creator': post.author.twitter ? '@' + post.author.twitter : null,
              'twitter:url': postUrl,
              'twitter:image': postImage,
              'twitter:label1': post.isPage ? 'Written by' : null,
              'twitter:data1': post.isPage ? post.author.name : null,
              'twitter:label2': tags.length ? 'Tagged with' : null,
              'twitter:data2': tags.length ? tags : null
            }
          }
        };

        // Determine which template the post should use. By default, this will be `post.dust`. If a
        // custom template is specified (`post.*.dust`), make sure it exists. Otherwise, fall back
        // to the default.
        let themeName = req.app.locals.Settings.theme;
        let template = post.template || 'post';
        let templatePath = Path.join(__basedir, 'themes', themeName, 'templates', template);
        if(template !== 'post' && !Fs.existsSync(templatePath)) template = 'post';

        // Render the template
        res.render(template, viewData);
      })
      .catch((err) => next(err));
  }

};
