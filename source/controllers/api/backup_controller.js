'use strict';

// Node modules
const Del = require('del');
const Fs = require('fs');
const HttpCodes = require('http-codes');
const JSZip = require('jszip');
const Mkdirp = require('mkdirp');
const Moment = require('moment');
const Path = require('path');
const Promise = require('bluebird');
const RecursiveReaddir = require('recursive-readdir');
const Tmp = require('tmp');

// Local modules
const UploadMiddleware = require(Path.join(__basedir, 'source/middleware/upload_middleware.js'));

//
// Adds an entire folder to a zip file.
//
//  folder* (string) - The full path of the folder to add.
//  zip* (object) - A zip object.
//
// Returns a promise.
//
function addFolderToZip(folder, zip) {
  return new Promise((resolve, reject) => {
    RecursiveReaddir(folder, (err, files) => {
      if(err) {
        return reject(new Error('Unable to read folder: ' + folder));
      }

      // Add each file to the zip
      files.forEach((file) => {
        let folder = Path.dirname(Path.relative(__basedir, file));
        let filename = Path.basename(file);
        zip
          .folder(folder)
          .file(filename, Fs.readFileSync(file));
      });

      resolve();
    });
  });
}

//
// Restores data from a backup if a restore file is found in the zip.
//
//  model* (object) - The model to restore.
//  zip* (object) - A zip object containing the data file.
//
// Returns a promise that resolve with a zip object.
//
function restoreData(model, zip) {
  return new Promise((resolve, reject) => {
    let filename = 'data/' + model.name + '.json';
    let queue = [];

    // No restore file, skip it
    if(!zip.files[filename]) {
      return resolve(zip);
    }

    // Read the restore file
    zip.files[filename].async('string')
      .then((data) => {
        // Parse the restore file
        try {
          data = JSON.parse(data);
        } catch(err) {
          return reject(new Error('Unable to parse JSON file: ' + filename));
        }

        if(data && data.length) {
          // Empty the table
          return model.destroy({ truncate: true })
            .then(() => {
              // Restore all rows
              data.forEach((row) => queue.push(model.create(row)));

              // Wait for all rows to populate before proceeding
              return Promise.all(queue).then(() => resolve(zip));
            });
        } else {
          return resolve(zip);
        }
      })
      .catch((err) => reject(err));
  });
}

//
// Restores data from a backup if a restore file is found in the zip.
//
//  sourceFolder* (string) - The path to the folder in the zip file.
//  destinationFolder* (string) - The path to restore the folder to.
//  zip* (object) - A zip object containing the data file.
//
// Returns a promise that resolve with a zip object.
//
function restoreFolderFromZip(sourceFolder, targetFolder, zip) {
  return new Promise((resolve, reject) => {
    // Folder name must end in a trailing slash
    sourceFolder = sourceFolder.replace(/\/$/, '') + '/';

    // No restore files, skip it
    if(!zip.files[sourceFolder]) {
      return resolve(zip);
    }

    // Delete target
    Del(targetFolder)
      .then(() => {
        let queue = [];
        let files = Object.keys(zip.files);

        // Move files from zip to target
        if(files && files.length) {
          files.forEach((file) => {
            // Skip folders and files that aren't in the source folder
            if(zip.files[file].dir || file.indexOf(sourceFolder) !== 0) return;

            let pathname = Path.join(targetFolder, Path.relative(sourceFolder, file));
            let dirname = Path.dirname(pathname);

            // Queue restoration
            queue.push(
              // Read the file's content
              zip.files[file].async('nodebuffer')
                .then((buffer) => {
                  // Create the directory if it doesn't exist
                  Mkdirp(Path.dirname(pathname), (err) => {
                    if(err) {
                      return reject(new Error('Unable to create directory: ' + dirname));
                    }

                    // Create the file
                    Fs.writeFile(pathname, buffer, (err) => {
                      if(err) {
                        return reject(new Error('Unable to create file: ' + pathname));
                      }
                    });
                  });
                })
                .catch((err) => reject(err))
            );
          });

          // Wait for all files to be written before proceeding
          return Promise.all(queue).then(() => resolve(zip));
        } else {
          // No files, continue restoring
          resolve(zip);
        }
      })
      .catch((err) => reject(err));
  });
}

//
// Checks the backup file for postleaf.json to see if it's a valid zip file. We current do this by
// checking for postleaf.json, but this could become a more elaborate check in the future.
//
//  zip* (object) - A zip object containing the data file.
//
// Returns a promise that resolve with a zip object.
//
function verifyBackup(zip) {
  return new Promise((resolve, reject) => {
    if(zip.files['postleaf.json']) {
      resolve(zip);
    } else {
      reject(new Error('Invalid backup file.'));
    }
  });
}

module.exports = {

  //
  // Creates a backup.
  //
  //  data (string) - Whether or not to export data (default 'true').
  //  themes (string) - Whether or not to export themes.
  //  uploads (string) - Whether or not to export uploads.
  //
  // Returns a zip file response.
  //
  create: (req, res, next) => {
    const models = req.app.locals.Database.sequelize.models;

    let zip = new JSZip();
    let queue = [];

    // Add a meta file
    zip.file('postleaf.json', JSON.stringify({
      createdAt: Moment().tz('utc').format('YYYY-MM-DD HH:mm:ss')
    }, null, 2));

    // Export data
    if(typeof req.query.data === 'undefined' || req.query.data === 'true') {
      // Convert all database models to JSON strings
      for(let model in models) {
        // Export each model
        queue.push(
          models[model].findAll()
            .then((rows) => {
              let data = [];

              if(rows.length) {
                rows.forEach((row) => data.push(row.toJSON()));
              }

              // Write data to zip file
              zip.folder('data').file(model + '.json', JSON.stringify(data, null, 2));
            })
            .catch((err) => next(err))
        );
      }
    }

    // Export themes
    if(req.query.themes === 'true') {
      queue.push(addFolderToZip(Path.join(__basedir, 'themes'), zip));
    }

    // Export uploads
    if(req.query.uploads === 'true') {
      queue.push(addFolderToZip(Path.join(__basedir, 'uploads'), zip));
    }

    // Wait for all queue to resolve
    Promise.all(queue)
      .then(() => zip.generateAsync({ type: 'nodebuffer' }))
      .then((buffer) => {
        let filename = 'Postleaf Backup (' + Moment.tz('utc').format('YYYY-MM-DD') + ').zip';

        // Send zip as a download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.end(buffer);
      })
      .catch((err) => next(err));
  },

  //
  // Restores from a backup.
  //
  //  file* (file) - A zipped backup file.
  //
  // Returns a JSON response.
  //
  restore: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const models = req.app.locals.Database.sequelize.models;

    let tempDir = Tmp.dirSync();

    // Create a multer instance to receive the zip file
    const upload = UploadMiddleware.getMulter({
      allowedTypes: ['application/zip'],
      destination: tempDir.name
    }).single('file');

    // Call the upload middleware
    upload(req, res, (err) => {
      if(err) {
        res.status(HttpCodes.BAD_REQUEST);
        return next(err);
      }

      // Was a file uploaded?
      if(!req.file) {
        return res.status(HttpCodes.BAD_REQUEST).json({
          message: I18n.term('nothing_was_uploaded')
        });
      }

      // Extract zip contents
      Fs.readFile(req.file.path, (err, data) => {
        if(err) {
          res.status(HttpCodes.BAD_REQUEST).json({
            message: 'Unable to read from the temp file.'
          });
        }

        JSZip.loadAsync(data)
          .then((zip) => verifyBackup(zip))
          // Restore uploads
          .then((zip) => restoreFolderFromZip('uploads', Path.join(__basedir, 'uploads'), zip))
          // // Restore Themes
          .then((zip) => restoreFolderFromZip('themes', Path.join(__basedir, 'themes'), zip))
          // Restore data in a specific order to prevent foreign key constraint errors
          .then((zip) => restoreData(models.user, zip))
          .then((zip) => restoreData(models.post, zip))
          .then((zip) => restoreData(models.tag, zip))
          .then((zip) => restoreData(models.postTags, zip))
          .then((zip) => restoreData(models.navigation, zip))
          .then((zip) => restoreData(models.revision, zip))
          .then((zip) => restoreData(models.setting, zip))
          .then((zip) => restoreData(models.upload, zip))
          // Reload settings
          .then(() => models.setting.getObject().then((settings) => req.app.locals.Settings = settings))
          // Reload navigation
          .then(() => models.navigation.getArray().then((navigation) => req.app.locals.Navigation = navigation))
          .then(() => {
            res.json({
              message: I18n.term('your_backup_has_been_restored')
            });
          })
          .catch(() => {
            res.status(HttpCodes.INTERNAL_SERVER_ERROR);
            return next(I18n.term('your_backup_could_not_be_restored_from_this_file'));
          });
      });
    });

  }

};
