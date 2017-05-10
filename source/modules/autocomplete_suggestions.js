'use strict';

// Node modules
const Moment = require('moment');
const Path = require('path');
const Promise = require('bluebird');

const self = {

  //
  // Returns an array of link suggestions for use with autocomplete fields.
  //
  //  req* (object) - The request object.
  //  types (string|array) - The type of links to return: ['posts', 'users', 'tags'] (defaults to
  //    all)
  //
  // Returns a promise that resolves with an array of typeahead suggestions:
  //
  //  {
  //    type: '',
  //    label: '',
  //    searchText: '',
  //    url: ''
  //  }
  //
  getLinks: function(req, type) {
    return new Promise((resolve, reject) => {
      const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
      const sequelize = req.app.locals.Database.sequelize;
      const models = sequelize.models;

      let queue = [];

      // Type defaults to all types
      if(typeof type === 'undefined') type = ['posts', 'tags', 'users'];

      // Convert string type to array
      if(typeof type === 'string') type = [type];

      // Get users
      if(type.includes('users')) {
        queue.push(
          models.user
            .findAll({
              attributes: ['name', 'username'],
              order: [
                sequelize.fn('lower', sequelize.col('name'))
              ]
            })
            .then((users) => {
              return users.map((user) => {
                return {
                  type: 'user',
                  label: user.name,
                  searchText: user.name + ' ' + user.username,
                  url: MakeUrl.author(user.username)
                };
              });
            })
        );
      }

      // Get tags
      if(type.includes('tags')) {
        queue.push(
          models.tag
            .findAll({
              attributes: ['name', 'slug'],
              order: [
                sequelize.fn('lower', sequelize.col('name'))
              ]
            })
            .then((tags) => {
              return tags.map((tag) => {
                return {
                  type: 'tag',
                  label: tag.name,
                  searchText: tag.name + ' ' + tag.slug,
                  url: MakeUrl.tag(tag.slug)
                };
              });
            })
        );
      }

      // Get posts
      if(type.includes('posts')) {
        queue.push(
          models.post
            .findAll({
              attributes: ['title', 'slug'],
              where: {
                status: 'published',
                publishedAt: { $lt: Moment().utc().toDate() }
              },
              order: [
                sequelize.fn('lower', sequelize.col('title'))
              ]
            })
            .then((posts) => {
              return posts.map((post) => {
                return {
                  type: 'post',
                  label: post.title,
                  searchText: post.title + ' ' + post.slug,
                  url: MakeUrl.post(post.slug)
                };
              });
            })
        );
      }

      // Wait for all queue to resolve
      Promise.all(queue)
        .then((results) => {
          // Merge link suggestions into a single array
          let all = [];
          for(let i in results) {
            all = all.concat(results[i]);
          }

          resolve(all);
        })
        .catch((err) => reject(err));
    });
  }

};

module.exports = self;
