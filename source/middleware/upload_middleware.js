'use strict';

// Node modules
const Fs = require('fs');
const Mkdirp = require('mkdirp');
const Multer = require('multer');
const Path = require('path');
const SanitizeFilename = require('sanitize-filename');

module.exports = {

  //
  // Middleware that returns a Multer instance with custom fileFilter and storage options.
  //
  //  options* (object)
  //    - destination* (function|string) - The folder where files should be uploaded to.
  //    - allowedTypes (array|null) - Array of acceptable mime types or null to allow all files
  //      (default null).
  //    - overwrite (boolean) - Whether or not to overwrite files of the same name (default false).
  //      If false, conflicting images will be renamed with an incremental suffix: image_1.png
  //
  getMulter: (options) => {
    return Multer({
      // Filter out files of the wrong type
      fileFilter: (req, file, cb) => {
        const I18n = req.app.locals.I18n;

        // Check file extension against allowed types
        if(options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          return cb(new Error(I18n.term('invalid_file_format')));
        }

        cb(null, true);
      },

      // Store uploads to disk
      storage: Multer.diskStorage({
        destination: (req, file, cb) => {
          let destination = typeof options.destination === 'function' ? options.destination() : options.destination;

          // Set the target filename to the original filename and sanitize it
          file.targetName = SanitizeFilename(file.originalname);

          // Create the destination folder if it doesn't exist
          if(Fs.existsSync(destination)) {
            let parsed = Path.parse(file.targetName);
            let i = 0;

            // If a file with this name already exists, append a counter to the target filename
            if(!options.overwrite) {
              while(Fs.existsSync(Path.join(destination, file.targetName))) {
                file.targetName = parsed.name + '_' + (++i) + parsed.ext;
              }
            }

            cb(null, destination);
          } else {
            Mkdirp.sync(destination);
            cb(null, destination);
          }
        },

        // Generate filename
        filename: function(req, file, cb) {
          cb(null, file.targetName);
        }
      })

    });
  }

};
