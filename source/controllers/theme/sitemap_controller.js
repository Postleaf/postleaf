'use strict';

// Node modules
const Moment = require('moment');
const Promise = require('bluebird');

module.exports = {

  //
  // Renders the sitemap.xml page.
  //
  view: (req, res, next) => {
    const Settings = req.app.locals.Settings;
    const sequelize = req.app.locals.Database.sequelize;
    const models = sequelize.models;

    Promise
      .all([
        // Get homepage info
        models.post.findOne({
          attributes: ['slug', 'publishedAt', 'createdAt', 'updatedAt'],
          where: Settings.homepage ? {
            // Custom homepage, return last updated date from that post
            slug: Settings.homepage
          } : {
            // No custom homepage, return last updated date from all public posts
            status: 'published',
            isPage: 0,
            publishedAt: { $lt: Moment().utc().toDate() }
          },
          order: [
            ['updatedAt', 'DESC']
          ]
        }),
        // Fetch posts
        models.post.findAll({
          attributes: ['slug', 'publishedAt', 'createdAt', 'updatedAt'],
          where: {
            status: 'published',
            isPage: 0,
            publishedAt: { $lt: Moment().utc().toDate() }
          },
          order: [
            ['publishedAt', 'DESC']
          ]
        }),
        // Fetch pages
        models.post.findAll({
          attributes: ['slug', 'publishedAt', 'createdAt', 'updatedAt'],
          where: {
            status: 'published',
            isPage: 1,
            publishedAt: { $lt: Moment().utc().toDate() }
          },
          order: [
            ['publishedAt', 'DESC']
          ]
        }),
        // Fetch authors
        models.user.findAll({
          attributes: ['username', 'createdAt', 'updatedAt'],
          order: [
            sequelize.fn('lower', sequelize.col('name'))
          ]
        }),
        // Fetch tags
        models.tag.findAll({
          attributes: ['slug', 'createdAt', 'updatedAt'],
          order: [
            sequelize.fn('lower', sequelize.col('name'))
          ]
        })
      ])
      // Send the response
      .then((result) => {
        res.header('Content-Type', 'text/xml').render('sitemap', {
          homepage: result[0],
          posts: result[1],
          pages: result[2],
          authors: result[3],
          tags: result[4]
        });
      })
      .catch((err) => next(err));
  }

};
