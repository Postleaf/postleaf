'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Path = require('path');
const Promise = require('bluebird');

module.exports = {

  //
  // Gets a list of revisions.
  //
  //  postId (string) - Filter revisions by post id.
  //  userId (string) - Filter revisions by user id.
  //  count (int) - The number of posts to return (default 100).
  //  offset (int) - The offset to return posts from (default 0).
  //  render (string) - Set to 'revisionsTable' to return the rendered HTML from
  //    `admin/partials/revisions_table.dust`.
  //
  // Returns a JSON response:
  //
  //  { totalItems: 100, revisions: [] }
  //  { totalItems: 100, revisions: [], html: '' }
  //
  index: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;
    let count = parseInt(req.query.count) || 100;
    let offset = parseInt(req.query.offset) || 0;
    let where = {};

    // Filter by post id
    if(req.query.postId) where.postId = req.query.postId;

    // Filter by user id
    if(req.query.userId) where.userId = req.query.userId;

    // Fetch revisions
    models.revision
      .findAndCountAll({
        distinct: true,
        where: where,
        include: [
          {
            model: models.post,
            // All revisions for owners/admins/editors, only revisions to your posts for
            // contributors
            where: ['owner', 'admin', 'editor']
              .includes(User.role) ? undefined : { userId: User.id }
          },
          {
            model: models.user,
            as: 'author',
            attributes: { exclude: ['password', 'resetToken'] }
          }
        ],
        limit: count,
        offset: offset,
        order: [
          ['createdAt', 'DESC']
        ]
      })
      .then((result) => {
        return new Promise((resolve) => {
          // Render the revision table and return the revisions
          if(req.query.render === 'revisionsTable') {
            // Render the partial
            res.app.render('admin/partials/revisions_table', {
              revisions: result.rows
            }, (err, html) => {
              if(err) throw new Error(err);

              resolve({
                totalItems: result.count,
                revisions: result.rows,
                html: html
              });
            });

            return;
          }

          // Just return the revisions
          resolve({
            totalItems: result.count,
            revisions: result.rows
          });
        });
      })
      .then((json) => res.json(json))
      .catch((err) => next(err));
  },

  //
  // Creates a revision.
  //
  // NOTE: There is no method to create a revision. It happens internally when posts are saved.
  //
  // Always returns a Method Not Allowed response.
  //
  create: function(req, res) {
    return res.status(HttpCodes.METHOD_NOT_ALLOWED);
  },

  //
  // Gets a revision.
  //
  // Returns a JSON response:
  //
  //  { revision: {} }
  //
  read: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    models.revision
      .findOne({
        where: {
          id: req.params.id
        },
        include: [
          {
            model: models.post
          },
          {
            model: models.user,
            as: 'author',
            attributes: { exclude: ['password', 'resetToken'] }
          }
        ]
      })
      .then((revision) => {
        // Not found
        if(!revision) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Revision Not Found');
        }

        // All revisions for owners/admins/editors, only revisions to your posts for contributors
        if(
          !['owner', 'admin', 'editor'].includes(User.role) &&
          revision.post.userId !== User.id
        ) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        res.json({
          revision: revision
        });
      })
      .catch((err) => next(err));
  },

  //
  // Updates a revision.
  //
  // NOTE: There is no method to update a revision. Revisions are created internally at this time.
  //
  // Always returns a Method Not Allowed response.
  //
  update: function(req, res) {
    return res.status(HttpCodes.METHOD_NOT_ALLOWED);
  },

  //
  // Deletes a revision
  //
  // Returns a JSON response:
  //
  //  { deleted: true }
  //
  delete: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    // Fetch the revision
    models.revision
      .findOne({
        where: {
          id: req.params.id
        },
        include: [{
          model: models.post
        }]
      })
      .then((revision) => {
        // Not found
        if(!revision) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Revision Not Found');
        }

        // All revisions for owners/admins/editors, only revisions to your posts for contributors
        if(
          !['owner', 'admin', 'editor'].includes(User.role) &&
          revision.post.userId !== User.id
        ) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Delete it
        return revision.destroy();
      })
      .then(() => res.json({ deleted: true }))
      .catch((err) => next(err.message));
  },

  //
  // Renders a revision preview. Previews are rendered without any session context.
  //
  // Notes:
  //  - JSON-LD, OpenGraph, and Twitter Card data is not generated for previews.
  //
  // Renders the preview and returns a promise so the method can be called from other controllers.
  //
  preview: function(req, res, next) {
    const PostsController = require(Path.join(__basedir, 'source/controllers/api/posts_controller.js'));
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    return models.revision
      // Fetch the revision
      .findOne({
        where: {
          id: req.params.id
        },
        include: [{
          model: models.post
        }]
      })
      // Render the preview
      .then((revision) => {
        // All revisions for owners/admins/editors, only revisions to your posts for contributors
        if(
          !['owner', 'admin', 'editor'].includes(User.role) &&
          revision.post.userId !== User.id
        ) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Hand the request off to the post preview controller
        req.params = { id: revision.postId };
        req.body.post = JSON.stringify({
          title: revision.title,
          content: revision.content
        });

        return PostsController.preview(req, res, next);
      })
      .catch((err) => {
        res.status(HttpCodes.NOT_FOUND);
        return next(err);
      });
  }

};
