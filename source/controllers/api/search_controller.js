'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Path = require('path');
const Promise = require('bluebird');

// Local modules
const AdminMenu = require(Path.join(__basedir, 'source/modules/admin_menu.js'));

module.exports = {

  //
  // Gets search results.
  //
  //  search* (string) - The term to search for.
  //  render (string) - Set to 'locaterResults' to return the rendered HTML from
  //    `admin/partials/locater_results.dust`.
  //
  // Returns a JSON response:
  //
  //  { results: [] }
  //  { results: [], html: '' }
  //  { invalid: [] }
  //
  index: function(req, res, next) {
    const I18n = req.app.locals.I18n;
    const Settings = req.app.locals.Settings;
    const User = req.User;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const models = req.app.locals.Database.sequelize.models;
    let queue = [];
    let maxResults = 20;

    // Search is required
    if(!req.query.search) {
      return res.status(HttpCodes.BAD_REQUEST).json({
        invalid: ['search']
      });
    }

    // Special items
    let websiteResults = [];
    // Homepage link
    if(
      // Search can match any of these terms
      (Settings.title + ' ' + Settings.tagline + ' blog homepage website')
        .toLowerCase()
        .indexOf(req.query.search.toLowerCase())
        > -1
    ) {
      websiteResults.push({
        title: Settings.title,
        description: Settings.tagline,
        image: Settings.favicon || null,
        icon: 'fa fa-globe',
        link: MakeUrl.raw()
      });
    }

    // Search menu items
    let adminMenu = AdminMenu.get(I18n, User, Settings);
    let adminMenuResults = [];
    // Loop through groups
    adminMenu.forEach((group) => {
      // Loop through items
      if(Array.isArray(group.items)) {
        group.items.forEach((item) => {
          if(!item.noSearch && item.label.toLowerCase().indexOf(req.query.search.toLowerCase()) > -1) {
            adminMenuResults.push({
              title: item.label,
              description: null,
              icon: item.icon,
              link: item.link
            });
          }
        });
      }
    });

    // Search users
    if(['owner', 'admin'].includes(User.role)) {
      queue.push(
        models.user.search(req.query.search, { limit: maxResults })
          .then((users) => {
            let results = [];
            if(users.rows) {
              users.rows.forEach((user) => {
                results.push({
                  title: user.name,
                  description: user.username,
                  icon: 'fa fa-user',
                  image: user.avatar || null,
                  link: MakeUrl.admin('users/edit/' + encodeURIComponent(user.id))
                });
              });
            }
            return results;
          })
      );
    }

    // Search tags
    if(['owner', 'admin', 'editor'].includes(User.role)) {
      queue.push(
        models.tag.search(req.query.search, { limit: maxResults })
          .then((tags) => {
            let results = [];
            if(tags.rows) {
              tags.rows.forEach((tag) => {
                results.push({
                  title: tag.name,
                  description: tag.slug,
                  image: tag.image ? tag.image : null,
                  icon: 'fa fa-tag',
                  link: MakeUrl.admin('tags/edit/' + encodeURIComponent(tag.id))
                });
              });
            }
            return results;
          })
      );
    }

    // Search posts
    queue.push(
      models.post.search(req.query.search, {
        where: {
          // Show all posts for owners/admins/editors, only yours for contributors
          userId: ['owner', 'admin', 'editor'].includes(User.role) ? undefined : User.id
        },
        limit: maxResults
      })
        .then((posts) => {
          let results = [];
          if(posts.rows) {
            posts.rows.forEach((post) => {
              results.push({
                title: post.title,
                image: post.image ? post.image : null,
                icon: 'fa fa-file-text',
                description: post.slug,
                link: MakeUrl.admin('/posts/edit/' + encodeURIComponent(post.id))
              });
            });
          }
          return results;
        })
    );

    // Wait for the queue to resolve
    Promise.all(queue)
      .then((results) => {
        return new Promise((resolve) => {
          // Remove empty results and merge everything into a single array
          results = [].concat(
            websiteResults,
            adminMenuResults,
            ...results.filter((items) => items.length)
          );

          // Render locater results list and return it with results
          if(req.query.render === 'locaterResults') {
            // Render the partial
            res.app.render('admin/partials/locater_results', {
              results: results
            }, (err, html) => {
              if(err) throw new Error(err);
              resolve({
                results: results,
                html: html
              });
            });

            return;
          }

          // Just return the results
          resolve({
            results: results
          });
        });
      })
      .then((json) => res.json(json))
      .catch((err) => next(err));
  }

};
