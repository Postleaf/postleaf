'use strict';

// Node modules
const Extend = require('extend');
const Fs = require('fs');
const Path = require('path');
const Promise = require('bluebird');

const self = {

  //
  // Gets all post templates for the specified theme.
  //
  //  themeId* (string) - A theme id.
  //
  // Returns a promise that resolves with an array of post template objects.
  //
  getPostTemplates: (themeId) => {
    return new Promise((resolve, reject) => {
      let themeConfig = Path.join(__basedir, 'themes', themeId, 'theme.json');
      let themeData;

      // Read the theme's config file
      Fs.readFile(themeConfig, 'utf8', (err, data) => {
        if(err) {
          return reject(new Error('Unable to find theme.json.'));
        }

        // Parse it
        try {
          themeData = JSON.parse(data);
        } catch(err) {
          return reject(new Error('Unable to parse theme.json.'));
        }

        // Return an array of available templates
        return resolve(
          Array.isArray(themeData.customPostTemplates) ? themeData.customPostTemplates : []
        );
      });

    });
  },

  //
  // Gets all installed themes.
  //
  // Returns a promise that resolves with an array of theme objects: { id: '', path: '' }
  //
  getThemes: () => {
    return new Promise((resolve, reject) => {

      let themeDir = Path.join(__basedir, 'themes');

      Fs.readdir(themeDir, (err, files) => {
        if(err) {
          return reject(new Error('Unable to list directory: ' + themeDir));
        }

        let queue = [];

        // Loop through directories
        files.forEach((file) => {
          let path = Path.join(themeDir, file);

          // Build queue to fetch info from each theme
          queue.push(
            new Promise((resolve, reject) => {
              Fs.stat(path, (err, stat) => {
                if(err) return resolve();

                // Is this a directory?
                if(stat.isDirectory()) {

                  // Look for theme.json
                  let configPath = Path.join(path, 'theme.json');
                  Fs.stat(configPath, (err) => {
                    if(err) return resolve();

                    // Read theme.json
                    Fs.readFile(configPath, (err, data) => {
                      if(err) {
                        return reject(new Error('Unable to read file: ' + configPath));
                      }

                      // Decode it
                      try {
                        return resolve(
                          Extend(JSON.parse(data), {
                            id: file, // name of theme directory
                            path: Path.dirname(configPath) // full path to theme directory
                          })
                        );
                      } catch(err) {
                        return reject(new Error('Unable to parse file: ' + configPath + '. ' + err));
                      }
                    });
                  });
                } else {
                  return resolve();
                }
              });
            })
          );
        });

        // Wait for the queue to resolve
        Promise.all(queue)
          .then((themes) => {
            // Remove empties and sort by name
            themes = themes
              .filter((val) => !!val)
              .sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase());

            return resolve(themes);
          })
          .catch((err) => reject(err));
      });
    });
  }

};

module.exports = self;
