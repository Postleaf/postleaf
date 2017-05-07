'use strict';

// Node modules
const Promise = require('bluebird');

module.exports = {

  //
  // Renders the posts page.
  //
  view: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;
    let itemsPerPage = 50;
    let where = {};
    let status = [];
    let flag = [];
    let postFilters = (req.cookies.postFilters || '').split(',');

    // All posts for owners/admins/editors, only yours for contributors
    if(!['owner', 'admin', 'editor'].includes(User.role)) {
      where.userId = User.id;
    }

    // Restore status from cookie
    ['draft', 'pending', 'rejected', 'published'].forEach((key) => {
      if(postFilters.includes(key)) status.push(key);
    });

    // Restore flags from cookie
    ['isPage', 'isFeatured', 'isSticky'].forEach((key) => {
      if(postFilters.includes(key)) flag.push(key);
    });

    // Filter by status
    if(status && status.length) where.status = { $in: status };

    // Filter by flag
    if(flag && flag.length) {
      if(flag.includes('isPage')) where.isPage = 1;
      if(flag.includes('isFeatured')) where.isFeatured = 1;
      if(flag.includes('isSticky')) where.isSticky = 1;
    }

    Promise.resolve()
      // Fetch posts
      .then(() => {
        return models.post
          .findAll({
            where: where,
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
            limit: itemsPerPage,
            offset: 0,
            order: [
              ['publishedAt', 'DESC']
            ]
          });
      })
      // Render the template
      .then((posts) => {
        res.render('admin/posts', {
          meta: {
            bodyClass: 'posts',
            title: I18n.term('posts')
          },
          posts: posts,
          itemsPerPage: itemsPerPage,
          scripts: ['/assets/js/posts.bundle.js'],
          styles: ['/assets/css/posts.css']
        });
      })
      .catch((err) => next(err));
  }

};
