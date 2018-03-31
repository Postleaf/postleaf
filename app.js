'use strict';

// Environment
require('dotenv').config();
process.env.TZ = 'UTC';

// Node modules
const Chalk = require('chalk');
const Express = require('express');
const Fs = require('fs');
const Path = require('path');
const Promise = require('bluebird');

// Local modules
const Postleaf = require(Path.join(__dirname, 'index.js'));

// Express app
const app = Express();

// Configuration options
const options = {
  databasePath: Path.join(__dirname, 'data/database.sq3'),
  themePath: Path.join(__dirname, 'themes'),
  uploadPath: Path.join(__dirname, 'uploads')
};

Promise.resolve()
  // Make sure .env exists
  .then(() => {
    if(!Fs.existsSync(Path.join(__dirname, '.env'))) {
      throw new Error('Required config file .env is missing.');
    }
  })
  // Initialize Postleaf
  .then(() => Postleaf(app, options))
  .then(() => {

    // Start sailing! ⚓️
    app.listen(process.env.APP_PORT, process.env.APP_HOST || '::', () => {
      console.info('Postleaf publishing on port %d! 🌱', process.env.APP_PORT);
    });
  })
  .catch((err) => {
    console.error(
      Chalk.red('Error: ') + 'Postleaf failed to start! 🐛\n\n' +
      Chalk.red(err.stack)
    );
  });
