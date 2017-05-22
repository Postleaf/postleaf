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
  const RobotsController = require(Path.join(__basedir, 'source/controllers/theme/robots_controller.js'));
  const SearchController = require(Path.join(__basedir, 'source/controllers/theme/search_controller.js'));
  const SitemapController = require(Path.join(__basedir, 'source/controllers/theme/sitemap_controller.js'));
  const TagController = require(Path.join(__basedir, 'source/controllers/theme/tag_controller.js'));

  const slugs = {
    admin: process.env.APP_ADMIN_SLUG,
    author: process.env.APP_AUTHOR_SLUG,
    api: process.env.APP_API_SLUG,
    blog: process.env.APP_BLOG_SLUG,
    feed: process.env.APP_FEED_SLUG,
    page: process.env.APP_PAGE_SLUG,
    search: process.env.APP_SEARCH_SLUG,
    tag: process.env.APP_TAG_SLUG
  };

  //
  // Blog & custom homepage
  //
  //  GET /
  //  GET /page/:page
  //
  // With custom homepage:
  //
  //  GET /blog
  //  GET /blog/page/:page
  //

  // Homepage (can be either the blog index or a custom homepage)
  router.get('/', (req, res, next) => {
    if(app.locals.Settings.homepage) {
      // Homepage
      return PostController.customHomepage(req, res, next);
    } else {
      // Blog index
      return BlogController.view(req, res, next);
    }
  });

  // Blog at / (only when a custom homepage isn't set)
  router.get('/' + slugs.page + '/:page', ViewMiddleware.checkPageNumbers, (req, res, next) => {
    if(!app.locals.Settings.homepage) {
      return BlogController.view(req, res, next);
    }

    next();
  });

  // Blog at /blog (only when a custom homepage is set)
  router.get([
    '/' + slugs.blog,
    '/' + slugs.blog + '/' + slugs.page + '/:page'
  ], ViewMiddleware.checkPageNumbers, (req, res, next) => {
    if(app.locals.Settings.homepage) {
      return BlogController.view(req, res, next);
    }

    next();
  });

  //
  // Author
  //
  //  GET /author/:username
  //  GET /author/:username/page/:page
  //
  router.get([
    '/' + slugs.author + '/:username',
    '/' + slugs.author + '/:username/' + slugs.page + '/:page'
  ], ViewMiddleware.checkPageNumbers, AuthorController.view);

  //
  // Tag
  //
  //  GET /tag/:slug
  //  GET /tag/:slug/page/:page
  //
  router.get([
    '/' + slugs.tag + '/:slug',
    '/' + slugs.tag + '/:slug/' + slugs.page + '/:page'
  ], ViewMiddleware.checkPageNumbers, TagController.view);

  //
  // Search
  //
  //  GET /search
  //  GET /search/page/:page
  //
  router.get([
    '/' + slugs.search,
    '/' + slugs.search + '/' + slugs.page + '/:page'
  ], ViewMiddleware.checkPageNumbers, SearchController.view);

  //
  // Feed
  //
  //  GET /feed/:format
  //
  router.get('/' + slugs.feed + '/:format', FeedController.view);

  //
  // Post
  //
  //  GET /:slug
  //
  router.get('/:slug', PostController.view);

  //
  // Robots
  //
  //  GET /robot.txt
  //
  app.use('/robots.txt', RobotsController.view);

  //
  // Sitemap
  //
  //  Get /sitemap.xml
  //
  app.use('/sitemap.xml', SitemapController.view);

  // Attach the router to the app
  app.use(
    '/',
    InstallMiddleware.checkInstallation,
    router
  );

};
