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
  const InstallMiddleware = require(Path.join(__basedir, 'source/middleware/install_middleware.js'));

  // Controllers
  const DashboardController = require(Path.join(__basedir, 'source/controllers/admin/dashboard_controller.js'));
  const EditPostController = require(Path.join(__basedir, 'source/controllers/admin/edit_post_controller.js'));
  const EditTagController = require(Path.join(__basedir, 'source/controllers/admin/edit_tag_controller.js'));
  const EditUserController = require(Path.join(__basedir, 'source/controllers/admin/edit_user_controller.js'));
  const InstallController = require(Path.join(__basedir, 'source/controllers/admin/install_controller.js'));
  const LoginController = require(Path.join(__basedir, 'source/controllers/admin/login_controller.js'));
  const LogoutController = require(Path.join(__basedir, 'source/controllers/admin/logout_controller.js'));
  const NavigationController = require(Path.join(__basedir, 'source/controllers/admin/navigation_controller.js'));
  const PostsController = require(Path.join(__basedir, 'source/controllers/admin/posts_controller.js'));
  const QuickPostController = require(Path.join(__basedir, 'source/controllers/admin/quick_post_controller.js'));
  const RecoverPasswordController = require(Path.join(__basedir, 'source/controllers/admin/recover_password_controller.js'));
  const ResetPasswordController = require(Path.join(__basedir, 'source/controllers/admin/reset_password_controller.js'));
  const SettingsController = require(Path.join(__basedir, 'source/controllers/admin/settings_controller.js'));
  const TagsController = require(Path.join(__basedir, 'source/controllers/admin/tags_controller.js'));
  const UsersController = require(Path.join(__basedir, 'source/controllers/admin/users_controller.js'));

  //
  // Install
  //
  //  GET /admin/install
  //
  router.get(
    '/install',
    InstallController.view
  );

  //
  // Login
  //
  //  GET /admin/login
  //
  router.get(
    '/login',
    AuthMiddleware.forwardAuth,
    LoginController.view
  );

  //
  // Recover password
  //
  //  GET /admin/login/recover
  //
  router.get(
    '/login/recover',
    AuthMiddleware.forwardAuth,
    RecoverPasswordController.view
  );

  //
  // Reset password
  //
  //  GET /admin/login/reset
  //
  router.get(
    '/login/reset',
    AuthMiddleware.forwardAuth,
    ResetPasswordController.view
  );

  //
  // Logout
  //
  //  GET /admin/logout
  //
  router.get(
    '/logout',
    LogoutController.view
  );

  //
  // Dashboard
  //
  //  GET /admin
  //
  router.get(
    '/',
    AuthMiddleware.requireAuth,
    DashboardController.view
  );

  //
  // Posts
  //
  //  GET /admin/posts
  //
  router.get(
    '/posts',
    AuthMiddleware.requireAuth,
    PostsController.view
  );

  //
  // Edit posts
  //
  //  GET /admin/posts/new
  //  GET /admin/posts/edit/:id
  //
  router.get(
    '/posts/new',
    AuthMiddleware.requireAuth,
    EditPostController.view
  );
  router.get(
    '/posts/edit/:id',
    AuthMiddleware.requireAuth,
    EditPostController.view
  );

  //
  // Quick post
  //
  //  GET /admin/posts/quick
  //
  router.get(
    '/posts/quick',
    AuthMiddleware.requireAuth,
    QuickPostController.view
  );

  //
  // Tags
  //
  //  GET /admin/tags
  //
  router.get(
    '/tags',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    TagsController.view
  );

  //
  // Edit tags
  //
  //  GET /admin/tags/new
  //  GET /admin/tags/edit/:id
  //
  router.get(
    '/tags/new',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    EditTagController.view
  );
  router.get(
    '/tags/edit/:id',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin', 'editor']),
    EditTagController.view
  );

  //
  // Navigation
  //
  //  GET /admin/navigation
  //
  router.get(
    '/navigation',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    NavigationController.view
  );

  //
  // Users
  //
  //  GET /admin/users
  //
  router.get(
    '/users',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    UsersController.view
  );

  //
  // Edit user
  //
  //  GET /admin/users/new
  //  GET /admin/users/edit/:id
  //
  router.get(
    '/users/new',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    EditUserController.view
  );
  router.get(
    '/users/edit/:id',
    AuthMiddleware.requireAuth,
    (req, res, next) => {
      // Allow users to edit their own profile
      if(req.User.id === req.params.id) {
        return next();
      }

      return AuthMiddleware.requireRole(['owner', 'admin'])(req, res, next);
    },
    EditUserController.view
  );

  //
  // Settings
  //
  //  GET /admin/settings
  //
  router.get(
    '/settings',
    AuthMiddleware.requireAuth,
    AuthMiddleware.requireRole(['owner', 'admin']),
    SettingsController.view
  );

  // Attach the router to the app
  app.use(
    '/' + process.env.APP_ADMIN_SLUG + '/',
    InstallMiddleware.checkInstallation,
    router
  );

};
