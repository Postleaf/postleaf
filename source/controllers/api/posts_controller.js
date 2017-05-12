'use strict';

// Node modules
const Extend = require('extend');
const Fs = require('fs');
const HttpCodes = require('http-codes');
const Moment = require('moment');
const Path = require('path');
const Promise = require('bluebird');
const Striptags = require('striptags');

// Local modules
const AutoEmbed = require(Path.join(__basedir, 'source/modules/auto_embed.js'));
const DynamicImages = require(Path.join(__basedir, 'source/modules/dynamic_images.js'));
const Markdown = require(Path.join(__basedir, 'source/modules/markdown.js'));

//
// Handles the validation error response for create and update
//
function handleErrorResponse(req, res, err) {
  const I18n = req.app.locals.I18n;

  // Foreign key constraint error
  if(err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(HttpCodes.BAD_REQUEST).json({
      message: I18n.term('invalid_user'),
      invalid: ['user-id']
    });
  }

  // Unique constraint error
  if(err.name === 'SequelizeUniqueConstraintError') {
    let message = I18n.term('this_field_is_invalid');

    // Custom message based on field
    if(err.fields.includes('slug')) {
      message = I18n.term('this_slug_is_already_in_use');
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
  // Gets a list of posts.
  //
  //  search (string) - Filter posts by search (default null).
  //  status (string) - Optional CSV of statuses to filter by (default null). Ex: 'draft,published'
  //  flag (string) - Optional CSV of flags to filter by (default null). Ex: 'isFeatured,isSticky'
  //  count (int) - The number of posts to return (default 100).
  //  offset (int) - The offset to return posts from (default 0).
  //  render (string) - Set to 'postItems' to return the rendered HTML from `partials/post_items.dust`.
  //
  // Returns a JSON response:
  //
  //  { totalItems: 100, posts: [] }
  //  { totalItems: 100, posts: [], html: '' }
  //
  index: function(req, res, next) {
    const User = req.User;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let count = parseInt(req.query.count) || 100;
    let offset = parseInt(req.query.offset) || 0;
    let where = {};
    let status = typeof req.query.status === 'string' ? req.query.status.split(',') : null;
    let flag = typeof req.query.flag === 'string' ? req.query.flag.split(',') : null;
    let fetch;

    // All posts for owners/admins/editors, only yours for contributors
    if(!['owner', 'admin', 'editor'].includes(User.role)) {
      where.userId = User.id;
    }

    // Filter by status
    if(status && status.length) where.status = { $in: status };

    // Filter by flag
    if(flag && flag.length) {
      if(flag.includes('isPage')) where.isPage = 1;
      if(flag.includes('isFeatured')) where.isFeatured = 1;
      if(flag.includes('isSticky')) where.isSticky = 1;
    }

    if(req.query.search) {
      // Search
      fetch = models.post.search(req.query.search, {
        distinct: true,
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
        limit: count,
        offset: offset
      });
    } else {
      // No search
      fetch = models.post
        .findAndCountAll({
          distinct: true,
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
          limit: count,
          offset: offset,
          order: [
            ['publishedAt', 'DESC'],
            sequelize.fn('lower', sequelize.col('tags.name'))
          ]
        });
    }

    // Fetch posts
    fetch
      .then((result) => {
        return new Promise((resolve) => {
          // Render the post items and return the posts
          if(req.query.render === 'postItems') {
            // Render the partial
            res.app.render('admin/partials/post_items', {
              posts: result.rows
            }, (err, html) => {
              if(err) throw new Error(err);

              resolve({
                totalItems: result.count,
                posts: result.rows,
                html: html
              });
            });

            return;
          }

          // Just return the posts
          resolve({
            totalItems: result.count,
            posts: result.rows
          });
        });
      })
      .then((json) => res.json(json))
      .catch((err) => next(err));
  },

  //
  // Creates a post.
  //
  //  slug* (string) - The post's slug.
  //  user-id* (string) - The post author's id
  //  published-at* (string) - The publish date in YYYY-MM-DD HH:mm:ss format
  //  title* (string) - The post's title.
  //  content* (string) - The post's content as HTML.
  //  content-format (string) - The format of the content being submitted. Either 'html' or
  //    'markdown' (default 'html'). For markdown, URLs will be converted into embedded objects when
  //    a suitable oEmbed provider is found.
  //  image (string) - The post's image URL.
  //  meta-title (string) - The post's meta title.
  //  meta-description (string) - The post's meta description.
  //  template (string) - The name of the template the post should use (default null).
  //  status* (string) - The post status. Either 'draft', 'published', 'pending', or 'rejected'.
  //  is-page (int) - Set to true if the post is a page, false if not (default false).
  //  is-featured (int) - Set to true if the post is featured, false if not (default false).
  //  is-sticky (int) - Set to true if the post is sticky, false if not (default false).
  //  tags (array) - One or more tags to assign to the post.
  //
  // Returns a JSON response:
  //
  //  { post: {} }
  //  { message: '', invalid: [] }
  //
  create: function(req, res, next) {
    const User = req.User;
    const Settings = req.app.locals.Settings;
    const models = req.app.locals.Database.sequelize.models;
    let post;

    // All posts for owners/admins/editors, only yours for contributors
    if(!['owner', 'admin', 'editor'].includes(User.role) && req.body['user-id'] !== User.id) {
      res.status(HttpCodes.UNAUTHORIZED);
      return next('Unauthorized');
    }

    // Contributors can't publish or reject posts
    if(
      !['owner', 'admin', 'editor'].includes(User.role) &&
      ['published', 'rejected'].includes(req.body.status)
    ) {
      res.status(HttpCodes.UNAUTHORIZED);
      return next('Unauthorized');
    }

    Promise.resolve()
      // Process content
      .then(() => {
        // Convert markdown to HTML and auto-embed text URLs
        if(req.body['content-format'] === 'markdown') {
          return AutoEmbed.parse(req.body.content).then((content) => {
            req.body.content = Markdown.toHtml(content);
          });
        }
      })
      .then(() => {
        // Create the post
        return models.post.create({
          slug: req.body.slug,
          userId: req.body['user-id'],
          publishedAt: new Moment.tz(req.body['published-at'], Settings.timeZone).tz('UTC'),
          title: req.body.title,
          content: req.body.content,
          image: req.body.image,
          metaTitle: req.body['meta-title'],
          metaDescription: req.body['meta-description'],
          template: req.body.template,
          status: req.body.status || 'published',
          isPage: req.body['is-page'] === 'true',
          isFeatured: req.body['is-featured'] === 'true',
          isSticky: req.body['is-sticky'] === 'true'
        });
      })
      // Create an initial revision
      .then((result) => {
        post = result;

        return models.revision
          .create({
            postId: post.id,
            userId: req.User.id,
            revisionDate: Moment().format('YYYY-MM-DD HH:mm:ss'),
            title: post.title,
            content: post.content
          })
          .then(() => post);
      })
      // Assign tags to the post
      .then(() => {
        if(Array.isArray(req.body.tags)) {
          let queue = [];

          req.body.tags.forEach((tagId) => {
            queue.push(models.postTags.upsert({ postId: post.id, tagId: tagId }));
          });

          return Promise.all(queue);
        }
      })
      // Send a response
      .then(() => {
        res.json({
          post: post
        });
      })
      .catch((err) => handleErrorResponse(req, res, err));
  },

  //
  // Gets a post.
  //
  // Returns a JSON response:
  //
  //  { post: {} }
  //
  read: function(req, res, next) {
    const User = req.User;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;

    models.post
      .findOne({
        where: {
          id: req.params.id
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
        order: [
          sequelize.fn('lower', sequelize.col('tags.name'))
        ]
      })
      .then((post) => {
        // Not found
        if(!post) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Post Not Found');
        }

        // All posts for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && post.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        res.json({
          post: post
        });
      })
      .catch((err) => next(err));
  },

  //
  // Updates a post.
  //
  //  slug (string) - The post's slug.
  //  user-id (string) - The post author's id
  //  published-at (string) - The publish date in YYYY-MM-DD HH:mm:ss format
  //  title (string) - The post's title.
  //  content (string) - The post's content as HTML.
  //  image (string) - The post's image as URL.
  //  meta-title (string) - The post's meta title.
  //  meta-description (string) - The post's meta description.
  //  template (string) - The name of the template the post should use.
  //  status (string) - The post status. Either 'draft', 'published', 'pending', or 'rejected'.
  //  is-page (int) - Set to true if the post is a page, false if not.
  //  is-featured (int) - Set to true if the post is featured, false if not.
  //  is-sticky (int) - Set to true if the post is sticky, false if not.
  //  tags (array) - One or more tags to assign to the post.
  //
  // Returns a JSON response:
  //
  //  { post: {} }
  //  { message: '', invalid: [] }
  //
  update: function(req, res, next) {
    const User = req.User;
    const Settings = req.app.locals.Settings;
    const models = req.app.locals.Database.sequelize.models;
    let post;

    // Fetch the post
    models.post
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((result) => {
        post = result;

        // Not found
        if(!post) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Post Not Found');
        }

        // All posts for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && post.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Contributors can't publish or reject posts unless the post is already published/rejected
        if(
          // Not an owner/admin/editor
          !['owner', 'admin', 'editor'].includes(User.role) &&
          // A status is set
          typeof req.body.status !== 'undefined' &&
          // The new status is rejected or published and doesn't match the old status
          (['rejected', 'published'].includes(req.body.status) && req.body.status !== post.status)
        ) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Set fields
        if(typeof req.body.slug !== 'undefined') post.slug = req.body.slug;
        if(typeof req.body['user-id'] !== 'undefined') post.userId = req.body['user-id'];
        if(typeof req.body['published-at'] !== 'undefined') {
          post.publishedAt = new Moment.tz(req.body['published-at'], Settings.timeZone).tz('UTC');
        }
        if(typeof req.body.title !== 'undefined') post.title = req.body.title;
        if(typeof req.body.content !== 'undefined') post.content = req.body.content;
        if(typeof req.body.image !== 'undefined') post.image = req.body.image;
        if(typeof req.body['meta-title'] !== 'undefined') post.metaTitle = req.body['meta-title'];
        if(typeof req.body['meta-description'] !== 'undefined') post.metaDescription = req.body['meta-description'];
        if(typeof req.body.template !== 'undefined') post.template = req.body.template;
        if(typeof req.body.status !== 'undefined') post.status = req.body.status;
        if(typeof req.body['is-page'] !== 'undefined') post.isPage = req.body['is-page'] === 'true';
        if(typeof req.body['is-featured'] !== 'undefined') post.isFeatured = req.body['is-featured'] === 'true';
        if(typeof req.body['is-sticky'] !== 'undefined') post.isSticky = req.body['is-sticky'] === 'true';

        // Update the post
        return post.save();
      })
      // Create a revision
      .then(() => {
        return models.revision.create({
          postId: post.id,
          userId: req.User.id,
          revisionDate: Moment().format('YYYY-MM-DD HH:mm:ss'),
          title: post.title,
          content: post.content
        });
      })
      // Update tags
      .then(() => {
        if(Array.isArray(req.body.tags)) {
          return models.postTags
            // Remove old tags
            .destroy({
              where: { postId: post.id }
            })
            // Add new tags
            .then(() => {
              let queue = [];
              req.body.tags.forEach((tagId) => {
                queue.push(models.postTags.upsert({ postId: post.id, tagId: tagId }));
              });

              return Promise.all(queue);
            });
        }
      })
      // Send a response
      .then(() => {
        res.json({
          post: post
        });
      })
      .catch(() => handleErrorResponse(req, res, next));
  },

  //
  // Deletes a post
  //
  // Returns a JSON response:
  //
  //  { deleted: true }
  //
  delete: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    // Fetch the post
    models.post
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((post) => {
        // Not found
        if(!post) {
          if(!post) {
            res.status(HttpCodes.NOT_FOUND);
            throw new Error('Post Not Found');
          }
        }

        // All posts for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && post.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Delete the post
        return post.destroy();
      })
      .then(() => res.json({ deleted: true }))
      .catch((err) => next(err.message));
  },

  //
  // Renders a post preview. Previews are rendered without any session context so users can see the
  // post as normal visitors would.
  //
  // Query params:
  //
  //  isEditor (string) - Set to 'true' when the post is being rendered in the editor.
  //  isZenMode (string) - Set to 'true' to render the post in a distraction-free template.
  //
  // Body params (POST request only)
  //
  //  post (string) - A JSON string of post data that can be used to override existing properties.
  //
  // Notes:
  //  - The :id request param can be a post ID or the string ':blank'.
  //  - JSON-LD, OpenGraph, and Twitter Card data is not generated for previews.
  //
  // Renders the preview and returns a promise so the method can be called from other controllers.
  //
  preview: function(req, res, next) {
    const User = req.User;
    const Settings = req.app.locals.Settings;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let post;

    // Parse custom post data
    let customPostData;
    try {
      customPostData = JSON.parse(req.body.post || '{}');
    } catch(err) {
      res.status(HttpCodes.BAD_REQUEST);
      return next('Invalid JSON string for post parameter.');
    }

    // Fetch the post, the post's author, and all related tags
    return models.post
      .findOne({
        where: {
          id: req.params.id
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
        order: [
          sequelize.fn('lower', sequelize.col('tags.name'))
        ]
      })
      // Inject srcset attribute for dynamic images
      .then((post) => {
        if(post) {
          return DynamicImages
            .injectSrcset(post.content, models.upload)
            .then((content) => Extend(post, { content: content }))
            .catch((err) => next(err));
        }

        return post;
      })
      .then((result) => {
        let queue = [];
        post = result;

        if(!post) {
          // No post found, should we render a blank one?
          if(req.params.id === ':blank') {
            // Create a blank post object
            post = {
              slug: '',
              userId: User.id,
              author: User,
              publishedAt: '',
              title: '',
              content: '',
              metaTitle: '',
              metaDescription: '',
              template: '',
              status: 'published',
              isPage: false,
              isFeatured: false,
              isSticky: false
            };
          } else {
            // Not found
            res.status(HttpCodes.NOT_FOUND);
            throw new Error('Post Not Found');
          }
        }

        // All posts for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && post.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Merge custom post data
        if(customPostData) {
          if(typeof customPostData.slug !== 'undefined') post.slug = customPostData.slug;
          if(typeof customPostData['user-id'] !== 'undefined') post.userId = customPostData['user-id'];
          if(typeof customPostData['published-at'] !== 'undefined') {
            post.publishedAt = new Moment.tz(customPostData['published-at'], Settings.timeZone).tz('utc');
          }
          if(typeof customPostData.title !== 'undefined') post.title = customPostData.title;
          if(typeof customPostData.content !== 'undefined') post.content = customPostData.content;
          if(typeof customPostData.image !== 'undefined') post.image = customPostData.image;
          if(typeof customPostData['meta-title'] !== 'undefined') post.metaTitle = customPostData['meta-title'];
          if(typeof customPostData['meta-description'] !== 'undefined') post.metaDescription = customPostData['meta-description'];
          if(typeof customPostData.template !== 'undefined') post.template = customPostData.template;
          if(typeof customPostData.status !== 'undefined') post.status = customPostData.status;
          if(typeof customPostData['is-page'] !== 'undefined') post.isPage = customPostData['is-page'] === true;
          if(typeof customPostData['is-featured'] !== 'undefined') post.isFeatured = customPostData['is-featured'] === true;
          if(typeof customPostData['is-sticky'] !== 'undefined') post.isSticky = customPostData['is-sticky'] === true;

          // Override author
          if(typeof customPostData['user-id'] !== 'undefined') {
            queue.push(
              models.user
                .findOne({
                  where: { id: customPostData['user-id'] }
                })
                .then((user) => post.author = user)
            );
          }

          // Override tags
          if(typeof customPostData['tags'] !== 'undefined') {
            post.tags = [];

            // Fetch all tags and append them to post.tags
            if(Array.isArray(customPostData['tags'])) {
              customPostData['tags'].forEach((id) => {
                queue.push(
                  models.tag.findOne({ where: { id: id } }).then((tag) => post.tags.push(tag))
                );
              });
            }
          }
        }

        // Wait for all queue to resolve
        return Promise.all(queue);
      })
      .then(() => {
        // Assemble view data
        let metaTitle = post.metaTitle || post.title;
        let metaDescription = Striptags(post.metaDescription || post.content).split(' ', 50).join(' ');
        let viewData = {
          post: post,
          meta: {
            title: metaTitle,
            description: metaDescription
          }
        };

        // Determine which template the post should use
        let themeName = req.app.locals.Settings.theme;
        let template = req.query.template || post.template || 'post';
        let templatePath = Path.join(__basedir, 'themes', themeName, 'templates', template);
        if(template !== 'post' && !Fs.existsSync(templatePath)) template = 'post';

        // Prevent browsers from identifying XSS attacks when post previews are rendered.
        // See http://stackoverflow.com/questions/1547884/refused-to-execute-a-javascript-script-source-code-of-script-found-within-reque
        res.set('X-XSS-Protection', '0');

        // Create a copy of the response object so we can safely modify it for the preview. Remove
        // user session data and append the isEditor flag if it's desired.
        let previewRes = Extend({}, res);
        previewRes.locals.User = null;
        previewRes.locals.isEditor = req.query.isEditor === 'true';

        // Render the post
        if(req.query.isZenMode === 'true') {
          // Use zen mode template
          previewRes.render('zen_mode', viewData, (err, html) => res.end(html));
        } else {
          // Use post template
          previewRes.render(template, viewData, (err, html) => res.end(html));
        }
      })
      .catch((err) => next(err));
  }

};
