'use strict';

// Node modules
const Express = require('express');
const Path = require('path');

module.exports = (app) => {

  const router = Express.Router({
    caseSensitive: app.get('case sensitive routing'),
    strict: app.get('strict routing')
  });

  // Router-level middleware
  const AuthMiddleware = require(Path.join(__basedir, 'source/middleware/auth_middleware.js'));

  // Controllers
  const AuthController = require(Path.join(__basedir, 'source/controllers/api/auth_controller.js'));
  const BackupController = require(Path.join(__basedir, 'source/controllers/api/backup_controller.js'));
  const EmbedController = require(Path.join(__basedir, 'source/controllers/api/embed_controller.js'));
  const InstallController = require(Path.join(__basedir, 'source/controllers/api/install_controller.js'));
  const NavigationController = require(Path.join(__basedir, 'source/controllers/api/navigation_controller.js'));
  const PostsController = require(Path.join(__basedir, 'source/controllers/api/posts_controller.js'));
  const RevisionsController = require(Path.join(__basedir, 'source/controllers/api/revisions_controller.js'));
  const TagsController = require(Path.join(__basedir, 'source/controllers/api/tags_controller.js'));
  const SearchController = require(Path.join(__basedir, 'source/controllers/api/search_controller.js'));
  const SettingsController = require(Path.join(__basedir, 'source/controllers/api/settings_controller.js'));
  const UploadsController = require(Path.join(__basedir, 'source/controllers/api/uploads_controller.js'));
  const UsersController = require(Path.join(__basedir, 'source/controllers/api/users_controller.js'));

  //
  // Install
  //
  //  POST /api/install
  //
  router.post(
    '/install',
    InstallController.install
  );

  //
  // Auth
  //
  //  POST /api/auth
  //  POST /api/auth/recover
  //  POST /api/auth/reset
  //
  router.post(
    '/auth',
    AuthController.authenticate
  );
  router.post(
    '/auth/recover',
    AuthController.recoverPassword
  );
  router.post(
    '/auth/reset',
    AuthController.resetPassword
  );

  //
  // Backups
  //
  //  GET /api/backup
  //  PUT /api/backup
  //
  router.get(
    '/backup',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    BackupController.create
  );
  router.put(
    '/backup',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    BackupController.restore
  );

  //
  // Navigation
  //
  //  GET /api/navigation
  //  PUT /api/navigation
  //
  router.get(
    '/navigation',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    NavigationController.index
  );
  router.put(
    '/navigation',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    NavigationController.update
  );

  //
  // Embed
  //
  //  GET /api/embed
  //
  router.get(
    '/embed',
    AuthMiddleware.requireAuth,
    EmbedController.getFromProvider
  );

  //
  // Posts
  //
  //  GET /api/posts
  //  POST /api/posts
  //  GET /api/posts/:id
  //  GET /api/posts/:id/preview
  //  POST /api/posts/:id/preview
  //  PUT /api/posts/:id
  //  DELETE /api/posts/:id
  //
  router.get(
    '/posts',
    AuthMiddleware.requireAuth,
    PostsController.index
  );
  router.post(
    '/posts',
    AuthMiddleware.requireAuth,
    PostsController.create
  );
  router.get(
    '/posts/:id',
    AuthMiddleware.requireAuth,
    PostsController.read
  );
  router.get(
    '/posts/:id/preview',
    AuthMiddleware.requireAuth,
    PostsController.preview
  );
  router.post(
    '/posts/:id/preview',
    AuthMiddleware.requireAuth,
    PostsController.preview
  );
  router.put(
    '/posts/:id',
    AuthMiddleware.requireAuth,
    PostsController.update
  );
  router.delete(
    '/posts/:id',
    AuthMiddleware.requireAuth,
    PostsController.delete
  );

  //
  // Revisions
  //
  //  GET /api/revisions
  //  POST /api/revisions
  //  GET /api/revisions/:id
  //  GET /api/posts/:id/preview
  //  PUT /api/revisions/:id
  //  DELETE /api/revisions/:id
  //
  router.get(
    '/revisions',
    AuthMiddleware.requireAuth,
    RevisionsController.index
  );
  router.post(
    '/revisions',
    AuthMiddleware.requireAuth,
    RevisionsController.create
  );
  router.get(
    '/revisions/:id',
    AuthMiddleware.requireAuth,
    RevisionsController.read
  );
  router.get(
    '/revisions/:id/preview',
    AuthMiddleware.requireAuth,
    RevisionsController.preview
  );
  router.put(
    '/revisions/:id',
    AuthMiddleware.requireAuth,
    RevisionsController.update
  );
  router.delete(
    '/revisions/:id',
    AuthMiddleware.requireAuth,
    RevisionsController.delete
  );

  //
  // Search
  //
  //  GET /api/search
  //
  router.get(
    '/search',
    AuthMiddleware.requireAuth,
    SearchController.index
  );

  //
  // Settings
  //
  //  GET /api/settings
  //  PUT /api/settings
  //
  router.get(
    '/settings',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    SettingsController.index
  );
  router.put(
    '/settings',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    SettingsController.update
  );

  //
  // Tags
  //
  //  GET /api/tags
  //  POST /api/tags
  //  GET /api/tags/:id
  //  PUT /api/tags/:id
  //  DELETE /api/tags/:id
  //
  router.get(
    '/tags',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    TagsController.index
  );
  router.post(
    '/tags',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    TagsController.create
  );
  router.get(
    '/tags/:id',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    TagsController.read
  );
  router.put(
    '/tags/:id',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    TagsController.update
  );
  router.delete(
    '/tags/:id',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    TagsController.delete
  );

  //
  // Uploads
  //
  //  GET /api/uploads
  //  POST /api/uploads
  //  GET /api/uploads/:id
  //  GET /api/uploads/:id/download
  //  PUT /api/uploads/:id
  //  DELETE /api/uploads/:id
  //
  router.get(
    '/uploads',
    AuthMiddleware.requireAuth,
    UploadsController.index
  );
  router.post(
    '/uploads',
    AuthMiddleware.requireAuth,
    UploadsController.create
  );
  router.get(
    '/uploads/:id',
    AuthMiddleware.requireAuth,
    UploadsController.read
  );
  router.get(
    '/uploads/:id/download',
    AuthMiddleware.requireAuth,
    UploadsController.download
  );
  router.put(
    '/uploads/:id',
    AuthMiddleware.requireAuth,
    UploadsController.update
  );
  router.delete(
    '/uploads/:id',
    AuthMiddleware.requireAuth,
    UploadsController.delete
  );

  //
  // Users
  //
  //  GET /api/users
  //  POST /api/users
  //  GET /api/users/:id
  //  PUT /api/users/:id
  //  DELETE /api/users/:id
  //
  router.get(
    '/users',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    UsersController.index
  );
  router.post(
    '/users',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    UsersController.create
  );
  router.get(
    '/users/:id',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    UsersController.read
  );
  router.put(
    '/users/:id',
    AuthMiddleware.requireAuth,
    (req, res, next) => {
      // Allow users to edit their own profile
      if(req.User.id === req.params.id) {
        return next();
      }

      // Otherwise
      return AuthMiddleware.requireRole(['owner', 'admin'])(req, res, next);
    },
    UsersController.update
  );
  router.delete(
    '/users/:id',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    UsersController.delete
  );

  // Attach the router to the app
  app.use('/' + process.env.APP_API_SLUG, router);

};
