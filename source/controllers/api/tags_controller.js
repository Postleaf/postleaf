'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Promise = require('bluebird');

//
// Handles the validation error response for create and update
//
function handleErrorResponse(req, res, err) {
  const I18n = req.app.locals.I18n;

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
  // Gets a list of tags.
  //
  //  search (string) - Filter tags by search (default null).
  //  count (int) - The number of tags to return (default 100).
  //  offset (int) - The offset to return tags from (default 0).
  //  render (string) - Set to 'tagCards' to return the rendered HTML from
  //    `admin/partials/tag_cards.dust`.
  //
  // Returns a JSON response:
  //
  //  { totalItems: 100, tags: [] }
  //  { totalItems: 100, tags: [], html: '' }
  //
  index: function(req, res, next) {
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;
    let count = parseInt(req.query.count) || 100;
    let offset = parseInt(req.query.offset) || 0;
    let fetch;

    if(req.query.search) {
      // Search
      fetch = models.tag.search(req.query.search, {
        limit: count,
        offset: offset
      });
    } else {
      // No search
      fetch = models.tag
        .findAndCountAll({
          limit: count,
          offset: offset,
          order: [
            sequelize.fn('lower', sequelize.col('name'))
          ]
        });
    }

    // Fetch tags
    fetch
      .then((result) => {
        return new Promise((resolve) => {
          // Render the tag cards and return the tags
          if(req.query.render === 'tagCards') {
            // Render the partial
            res.app.render('admin/partials/tag_cards', {
              tags: result.rows
            }, (err, html) => {
              if(err) throw new Error(err);

              resolve({
                totalItems: result.count,
                tags: result.rows,
                html: html
              });
            });

            return;
          }

          // Just return the tags
          resolve({
            totalItems: result.count,
            tags: result.rows
          });
        });
      })
      .then((json) => res.json(json))
      .catch((err) => next(err));
  },

  //
  // Creates a tag.
  //
  //  name* (string) - The tag's name.
  //  slug* (string) - The tag's slug.
  //  description (string) - The tag's description.
  //  image (string) - The tag's cover image URL.
  //  meta-title (string) - The tag's meta title.
  //  meta-description (string) - The tag's meta description.
  //
  // Returns a JSON response:
  //
  //  { tag: {} }
  //  { message: '', invalid: [] }
  //
  create: function(req, res) {
    const models = req.app.locals.Database.sequelize.models;

    // Create the tag
    models.tag
      .create({
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
        image: req.body.image,
        metaTitle: req.body['meta-title'],
        metaDescription: req.body['meta-description']
      })
      .then((tag) => {
        res.json({
          tag: tag
        });
      })
      .catch((err) => handleErrorResponse(req, res, err));
  },

  //
  // Gets a tag.
  //
  // Returns a JSON response:
  //
  //  { tag: {} }
  //
  read: function(req, res, next) {
    const models = req.app.locals.Database.sequelize.models;

    models.tag
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((tag) => {
        // Not found
        if(!tag) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Tag Not Found');
        }

        res.json({
          tag: tag
        });
      })
      .catch((err) => next(err));
  },

  //
  // Updates a tag.
  //
  //  name (string) - The tag's name.
  //  slug (string) - The tag's slug.
  //  description (string) - The tag's description.
  //  image (string) - The tag's cover image URL.
  //  meta-title (string) - The tag's meta title.
  //  meta-description (string) - The tag's meta description.
  //
  // Returns a JSON response:
  //
  //  { tag: {} }
  //  { message: '', invalid: [] }
  //
  update: function(req, res) {
    const models = req.app.locals.Database.sequelize.models;

    // Fetch the tag
    models.tag
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((tag) => {
        // Not found
        if(!tag) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Tag Not Found');
        }

        // Set fields
        if(typeof req.body.name !== 'undefined') tag.name = req.body.name;
        if(typeof req.body.slug !== 'undefined') tag.slug = req.body.slug;
        if(typeof req.body.description !== 'undefined') tag.description = req.body.description;
        if(typeof req.body.image !== 'undefined') tag.image = req.body.image;
        if(typeof req.body['meta-title'] !== 'undefined') tag.metaTitle = req.body['meta-title'];
        if(typeof req.body['meta-description'] !== 'undefined') tag.metaDescription = req.body['meta-description'];

        // Update the database
        return tag.save();
      })
      .then((tag) => {
        res.json({
          tag: tag
        });
      })
      .catch((err) => handleErrorResponse(req, res, err));
  },

  //
  // Deletes a tag
  //
  // Returns a JSON response:
  //
  //  { deleted: true }
  //
  delete: function(req, res, next) {
    const models = req.app.locals.Database.sequelize.models;

    // Fetch the tag
    models.tag
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((tag) => {
        // Not found
        if(!tag) {
          if(!tag) {
            res.status(HttpCodes.NOT_FOUND);
            throw new Error('Tag Not Found');
          }
        }

        // Delete the tag
        return tag.destroy();
      })
      .then(() => res.json({ deleted: true }))
      .catch((err) => next(err.message));
  }

};
