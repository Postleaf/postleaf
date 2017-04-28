'use strict';

// Node modules
const Extend = require('extend');
const Fs = require('fs');
const Path = require('path');
const Promise = require('bluebird');

let i18n;

module.exports = {

  //
  // Gets all installed language packs.
  //
  // Returns a promise that resolves with an array of theme objects.
  //
  getLanguagePacks: () => {
    return new Promise((resolve, reject) => {

      let langDir = Path.join(__basedir, 'source/languages');

      Fs.readdir(langDir, (err, files) => {
        if(err) {
          throw new Error('Unable to list directory: ' + langDir);
        }

        let queue = [];

        // Loop through files
        files.forEach((file) => {
          let path = Path.join(langDir, file);

          // Build queue to fetch info from each language pack
          queue.push(
            new Promise((res, rej) => {
              Fs.stat(path, (err, stat) => {
                if(err) return res();

                // Must be a file with a .json extension
                if(stat.isFile() && Path.extname(path).toLowerCase() === '.json') {

                  // Read the file
                  Fs.readFile(path, (err, data) => {
                    if(err) {
                      return rej('Unable to read file: ' + path);
                    }

                    // Decode it
                    try {
                      let json = JSON.parse(data);

                      // Only return the name and language code
                      res({
                        name: json.name,
                        code: json.code
                      });
                    } catch(err) {
                      rej('Unable to parse file: ' + path + '. ' + err);
                    }
                  });

                } else {
                  res();
                }
              });
            })
          );
        });

        // Wait for all queue to resolve
        Promise.all(queue)
          .then((languagePacks) => {
            // Remove empties and sort by name
            languagePacks = languagePacks
              .filter((val) => !!val)
              .sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase());

            resolve(languagePacks);
          })
          .catch((err) => reject(err));
      });
    });
  },

  //
  // Loads a language pack.
  //
  // Returns a promise that resolve with a language pack object.
  //
  load: (langCode) => {
    return new Promise((resolve, reject) => {
      // Load the language pack
      let defaultFile = Path.join(__basedir, 'source/languages/en_us.json');
      let targetFile = Path.join(
        __basedir,
        'source/languages/' + langCode.toLowerCase().replace('-', '_') + '.json'
      );
      let defaultLang;
      let targetLang;

      // Always load the default language pack first (missing terms will fall back to us-en)
      if(!Fs.existsSync(defaultFile)) {
        reject(new Error('The default language pack is missing: ' + defaultFile));
      }
      try {
        defaultLang = JSON.parse(Fs.readFileSync(defaultFile));
      } catch(err) {
        reject(err);
      }

      // Load the target language pack
      if(langCode !== 'en-us') {
        if(!Fs.existsSync(targetFile)) {
          reject(new Error('The target language pack is missing: ' + targetFile));
        }
        try {
          targetLang = JSON.parse(Fs.readFileSync(targetFile));
        } catch(err) {
          reject(err);
        }
      }

      // Merge target with default
      i18n = Extend(true, defaultLang, targetLang);

      resolve(i18n);
    });
  },

  //
  // Outputs a localized language term.
  //
  //  term* (string) - The term to output.
  //  params (object)
  //    - type (string) - One of 'term', 'symbol', or 'meta'.
  //    - placeholders (object) - A key/value object of placeholders to insert.
  //
  // Returns a string.
  //
  term: (term, params) => {
    params = params || {};
    let type = params.type || 'term';
    let placeholders = params.placeholders || [];

    // Check for a language pack
    if(!i18n) {
      throw new Error('Cannot use i18n without loading a language pack first.');
    }

    // Terms
    if(type === 'term') {
      // Find the desired term. If it doesn't exist, surround the key with square brackets to
      // allow us to identify missing terms more easily.
      let translation = i18n.terms[term] || '[' + term + ']';

      // Update placeholders
      for(let key in placeholders) {
        translation = translation.replace('[' + key + ']', placeholders[key]);
      }

      return translation;
    }

    // Symbols
    if(type === 'symbol') {
      return i18n.symbols[term];
    }

    // Meta
    if(type === 'meta') {
      return i18n[term];
    }

    throw new Error('Invalid arguments for i18n.term.');
  }

};
