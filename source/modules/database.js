'use strict';

// Node modules
const Mkdirp = require('mkdirp');
const Path = require('path');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
let databasePath = Path.join(__basedir, 'data/database.sq3');

const sequelize = new Sequelize(null, null, null, {
  dialect: 'sqlite',
  benchmark: false,
  logging: false, // console.log
  storage: databasePath
});

// Models
const navigation = sequelize.import(Path.join(__basedir, 'source/models/navigation_model.js'));
const post = sequelize.import(Path.join(__basedir, 'source/models/post_model.js'));
const tag = sequelize.import(Path.join(__basedir, 'source/models/tag_model.js'));
const user = sequelize.import(Path.join(__basedir, 'source/models/user_model.js'));
const revision = sequelize.import(Path.join(__basedir, 'source/models/revision_model.js'));
const setting = sequelize.import(Path.join(__basedir, 'source/models/setting_model.js'));
const upload = sequelize.import(Path.join(__basedir, 'source/models/upload_model.js'));

//
// Creates missing database tables.
//
// Returns a promise.
//
function init() {
  // Create the data directory if it doesn't exist
  let path = Path.join(__basedir, 'data');
  Mkdirp.sync(path);

  // Create missing tables and sync models
  return sequelize.sync();
}

//
// Loads settings from the settings table. If no settings exist, default settings will be created.
//
// Returns a promise that resolves with a settings object.
//
function loadSettings() {
  // Load settings
  return setting.getObject().then((settings) => {
    // If settings exist, assume the app has already been initialized
    if(Object.keys(settings).length) {
      return settings;
    }

    // Otherwise, write default settings and return them
    return Promise
      .all([
        setting.create({ key: 'cover', value: '/assets/images/sample_cover.jpg' }),
        setting.create({ key: 'defaultPostContent', value: 'Start writing here…' }),
        setting.create({ key: 'defaultPostTitle', value: 'Untitled Post' }),
        setting.create({ key: 'favicon', value: '/assets/images/postleaf_logo.svg' }),
        setting.create({ key: 'footCode', value: '' }),
        setting.create({ key: 'headCode', value: '' }),
        setting.create({ key: 'homepage', value: '' }),
        setting.create({ key: 'language', value: 'en-us' }),
        setting.create({ key: 'logo', value: '/assets/images/postleaf_wordmark.svg' }),
        setting.create({ key: 'postsPerPage', value: 5 }),
        setting.create({ key: 'tagline', value: 'Go forth and create!' }),
        setting.create({ key: 'theme', value: 'empower-theme' }),
        setting.create({ key: 'timeZone', value: 'UTC' }),
        setting.create({ key: 'title', value: 'A Postleaf Website' })
      ])
      .then(() => setting.getObject())
      .then((settings) => settings);
  });
}

// Associate posts with users
user.hasMany(post);
post.belongsTo(user, {
  foreignKey: 'userId',
  targetKey: 'id',
  as: 'author'
});

// Associate uploads with users
user.hasMany(upload);
upload.belongsTo(user, {
  foreignKey: 'userId',
  targetKey: 'id',
  as: 'author'
});

// Associate revisions with posts
post.hasMany(revision);
revision.belongsTo(post, {
  foreignKey: 'postId',
  targetKey: 'id'
});
user.hasMany(revision);
revision.belongsTo(user, {
  foreignKey: 'userId',
  targetKey: 'id',
  as: 'author'
});

// Associate tags with posts
post.belongsToMany(tag, { through: 'postTags' });
tag.belongsToMany(post, { through: 'postTags' });

// Link postTags back to post/tag
sequelize.models.postTags.belongsTo(post);
sequelize.models.postTags.belongsTo(tag);

// Remove primary keys from navigation and setting
navigation.removeAttribute('id');
setting.removeAttribute('id');

// Exports
module.exports = {
  init,
  loadSettings,
  sequelize
};
