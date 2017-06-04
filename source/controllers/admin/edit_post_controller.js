'use strict';

// Node modules
const Path = require('path');
const HttpCodes = require('http-codes');
const Promise = require('bluebird');

// Local modules
const AutocompleteSuggestions = require(Path.join(__basedir, 'source/modules/autocomplete_suggestions.js'));
const Themes = require(Path.join(__basedir, 'source/modules/themes.js'));

module.exports = {

  //
  // Renders the post editor.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const User = req.User;
    const Settings = req.app.locals.Settings;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let create = typeof req.params.id === 'undefined';
    let statuses = [];
    let authors;
    let linkSuggestions;
    let tags;
    let templates;

    Promise.resolve()
      // Get theme templates
      .then(() => Themes.getPostTemplates(Settings.theme))
      .then((result) => templates = result)
      // Get link suggestions
      .then(() => AutocompleteSuggestions.getLinks(req, ['users', 'tags', 'posts']))
      .then((links) => linkSuggestions = links)
      // Fetch authors
      .then(() => models.user.findAll({
        attributes: ['id', 'name', 'username'],
        order: [
          sequelize.fn('lower', sequelize.col('name'))
        ]
      }))
      .then((result) => authors = result)
      // Fetch tags
      .then(() => models.tag.findAll({
        attributes: ['id', 'slug', 'name'],
        order: [
          sequelize.fn('lower', sequelize.col('name'))
        ]
      }))
      .then((result) => tags = result)
      // Fetch the post
      .then(() => models.post.findOne({
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
      }))
      .then((post) => {
        // Owners/admins/editors can publish. Contributors can only publish if the post they're
        // editing is already published.
        let canPublish =
          ['owner', 'admin', 'editor'].includes(User.role) ||
          (!create && post.status === 'published');

        // Owners/admins/editors can reject. Contributors can only reject if the post they're
        // editing is already rejected.
        let canReject =
          ['owner', 'admin', 'editor'].includes(User.role) ||
          (!create && post.status === 'rejected');

        // Generate available statuses
        if(canPublish) statuses.push({ status: 'published', term: 'published' });
        statuses.push({ status: 'draft', term: 'draft' });
        statuses.push({ status: 'pending', term: 'pending_review' });
        if(canReject) statuses.push({ status: 'rejected', term: 'rejected' });

        if(!create && !post) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Page Not Found');
        }

        // All posts for owners/admins/editors, only yours for contributors
        if(!create && !['owner', 'admin', 'editor'].includes(User.role) && !User.id === post.userId) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Render the template
        res.render('admin/edit_post', {
          meta: {
            bodyClass: 'edit-post no-menu',
            title: I18n.term(create ? 'new_post' : 'edit_post')
          },
          post: post,
          authors: authors,
          tags: tags,
          templates: templates,
          statuses: statuses,
          linkSuggestions: linkSuggestions,
          scripts: ['/assets/js/edit_post.bundle.js'],
          styles: ['/assets/css/edit_post.css']
        });
      })
      .catch((err) => next(err));

  }

};
