'use strict';

// Node modules
const HttpCodes = require('http-codes');
const Path = require('path');

module.exports = {

  //
  // Creates the owner account, sample posts, and other installation data.
  //
  //  name* (string) - The owner's name.
  //  email (string) - The owner's email address.
  //  username* (string) - The owner's username.
  //  password* (string) - The owner's password.
  //
  // Returns a JSON response:
  //
  //  { authToken: '<token>' }
  //  { message: '', invalid: [] }
  //
  install: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(req.app.locals.Settings);
    const models = req.app.locals.Database.sequelize.models;
    let authToken;
    let owner;
    let tag;

    // If the app is installed, pretend the endpoint doesn't exist
    if(req.app.locals.isInstalled) {
      res.status(HttpCodes.NOT_FOUND);
      return next('Page Not Found');
    }

    // Verify password length
    if(req.body.password.length < 8) {
      return res.status(HttpCodes.BAD_REQUEST).json({
        message: I18n.term('passwords_need_to_be_at_least_eight_characters_long'),
        invalid: ['password']
      });
    }

    models.user
      // Create the owner account
      .create({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        password: models.user.hashPassword(req.body.password),
        role: 'owner',
        bio: 'Just another proud owner of a Postleaf website!',
        website: MakeUrl.raw({ absolute: true })
      })
      .then((user) => {
        owner = user;

        // Update the installation flag
        req.app.locals.isInstalled = true;

        // Generate an auth token (auto-login)
        authToken = user.generateAuthToken();

        // Set a cookie for supportive clients
        res.cookie('authToken', authToken.token, {
          path: '/',
          expires: authToken.expires
        });
      })
      // Create a sample nav item
      .then(() => models.navigation.create({ label: 'Home', link: '/' }))
      // Create a sample tag
      .then(() => {
        return models.tag
          .create({
            slug: 'getting-started',
            name: 'Getting Started'
          });
      })
      .then((result) => tag = result)
      // Create the first sample post
      .then(() => {
        return models.post
          .create({
            slug: 'welcome-to-postleaf',
            userId: owner.id,
            publishedAt: '2017-04-01 00:00:00',
            title: 'Welcome to Postleaf',
            content: `
              <p>Incredible! You just installed the world's most <em>amazing</em> publishing platform. You can use Postleaf to start a new blog or a website. Either way, great choice!</p>
              <p>By the way, this is just a sample post to help you get started. You can delete it anytime.</p>
              <h2>The Admin Panel</h2>
              <p>You can login to the admin panel by adding <code>/admin</code> to your website's URL. This is where you'll manage your posts, tags, users, and settings. For example: <code>example.com/admin</code> </p>
              <p>To logout, click the Postleaf logo and select <em>Logout</em>.</p>
              <h2>The Editor</h2>
              <p>Postleaf's editor shows you exactly what your post will look like as you write it. This is known as <em>inline editing</em>, but most people just call it "incredible." If you prefer a distraction-free environment, that's fine too. In that case, check out <em>Zen Mode</em>.</p>
              <p>Pretty much everything you need can be found in the toolbar, but there are a couple hidden features. Try dragging an image over the editor, for example. Or pasting a link to a YouTube video. Or using Markdown shortcuts as you type.</p>
              <h2>Everything Else</h2>
              <p>There's so much more to this software than just posts, but I'll get out of the way and let you do some exploring.</p>
              <p><strong>If you enjoy Postleaf, please tell someone about it.</strong> Post a status. Send a tweet. <a href="https://github.com/Postleaf/postleaf">Star the repo on GitHub</a>. Help me spread the word about Postleaf and, if you can, please <a href="https://www.paypal.me/abeautifulsite" target="_blank" rel="noopener noreferrer">make a donation</a> to the project so I can continue developing it.</p>
              <p>For more info and other helpful links, head over to <em>Settings &gt; About</em><em> in the admin panel.</em></p>
              <p>Happy publishing!</p>
              <p>— Cory LaViska, <em>Creator of Postleaf</em></p>
            `,
            image: '/assets/images/sample_post_image.jpg',
            status: 'published',
            isPage: false,
            isFeatured: false,
            isSticky: false
          });
      })
      .then((post) => models.postTags.upsert({ postId: post.id, tagId: tag.id }))
      // Send a response
      .then(() => {
        res.json({
          authToken: authToken
        });
      })
      .catch((err) => {
        // Validation error
        if(err.name === 'SequelizeValidationError') {
          // Only report one validation error at a time
          return res.status(HttpCodes.BAD_REQUEST).json({
            message: I18n.term(err.errors[0].message),
            invalid: [err.errors[0].path]
          });
        }

        return next(err);
      });

  }

};
