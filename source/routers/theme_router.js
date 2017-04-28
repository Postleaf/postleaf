'use strict';

// Node modules
const Express = require('express');
const Path = require('path');

module.exports = (app) => {

  // Create a router
  const router = Express.Router({
    caseSensitive: app.get('case sensitive routing'),
    strict: app.get('strict routing')
  });

  // Router-level middleware
  const InstallMiddleware = require(Path.join(__basedir, 'source/middleware/install_middleware.js'));
  const ViewMiddleware = require(Path.join(__basedir, 'source/middleware/view_middleware.js'));

  // Controllers
  const AuthorController = require(Path.join(__basedir, 'source/controllers/theme/author_controller.js'));
  const BlogController = require(Path.join(__basedir, 'source/controllers/theme/blog_controller.js'));
  const FeedController = require(Path.join(__basedir, 'source/controllers/theme/feed_controller.js'));
  const PostController = require(Path.join(__basedir, 'source/controllers/theme/post_controller.js'));
  const SearchController = require(Path.join(__basedir, 'source/controllers/theme/search_controller.js'));
  const TagController = require(Path.join(__basedir, 'source/controllers/theme/tag_controller.js'));
  const Settings = app.locals.Settings;

  //
  // Blog
  //
  //  GET /
  //  GET /page/:page
  //
  // With custom homepage:
  //
  //  GET /blog
  //  GET /blog/page/:page
  //
  if(app.locals.Settings.homepage) {
    // Custom homepage
    router.get('/', PostController.customHomepage);
    router.get([
      '/' + Settings.pathForBlog,
      '/' + Settings.pathForBlog + '/' + Settings.pathForPage + '/:page'
    ], ViewMiddleware.checkPageNumbers, BlogController.view);
  } else {
    // Without custom homepage
    router.get([
      '/',
      '/' + Settings.pathForPage + '/:page'
    ], ViewMiddleware.checkPageNumbers, BlogController.view);
  }

  //
  // Author
  //
  //  GET /author/:username
  //  GET /author/:username/page/:page
  //
  router.get([
    '/' + Settings.pathForAuthor + '/:username',
    '/' + Settings.pathForAuthor + '/:username/' + Settings.pathForPage + '/:page'
  ], ViewMiddleware.checkPageNumbers, AuthorController.view);

  //
  // Tag
  //
  //  GET /tag/:slug
  //  GET /tag/:slug/page/:page
  //
  router.get([
    '/' + Settings.pathForTag + '/:slug',
    '/' + Settings.pathForTag + '/:slug/' + Settings.pathForPage + '/:page'
  ], ViewMiddleware.checkPageNumbers, TagController.view);

  //
  // Search
  //
  //  GET /search
  //  GET /search/page/:page
  //
  router.get([
    '/' + Settings.pathForSearch,
    '/' + Settings.pathForSearch + '/' + Settings.pathForPage + '/:page'
  ], ViewMiddleware.checkPageNumbers, SearchController.view);

  //
  // Feed
  //
  //  GET /feed
  //
  router.get('/' + Settings.pathForFeed, FeedController.view);

  //
  // Post
  //
  //  GET /:slug
  //
  router.get('/:slug', PostController.view);

  // Attach the router to the app
  app.use(
    '/',
    InstallMiddleware.checkInstallation,
    router
  );

};
