'use strict';

// Node modules
const Crypto = require('crypto');
const Del = require('del');
const Fs = require('fs');
const Gm = require('gm');
const HttpCodes = require('http-codes');
const Moment = require('moment');
const Path = require('path');
const Promise = require('bluebird');

// Local modules
const UploadMiddleware = require(Path.join(__basedir, 'source/middleware/upload_middleware.js'));

const self = {

  //
  // Gets a list of uploads.
  //
  //  search (string) - Filter uploads by search (default null).
  //  mimeType (string) - One or more mime types to filter by separated by a comma (default null).
  //  count (int) - The number of uploads to return (default 100).
  //  offset (int) - The offset to return uploads from (default 0).
  //  render (string) - Set to 'fileManagerItems' to return the rendered HTML from
  //    `admin/partials/file_manager_items.dust`.
  //
  // Returns a JSON response:
  //
  //  { totalItems: 100, uploads: [] }
  //  { totalItems: 100, uploads: [], html: '' }
  //
  index: (req, res, next) => {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;
    let mimeType = req.query.mimeType;
    let count = parseInt(req.query.count) || 100;
    let offset = parseInt(req.query.offset) || 0;
    let where = {};
    let fetch;

    // All uploads for owners/admins/editors, only yours for contributors
    if(!['owner', 'admin', 'editor'].includes(User.role)) {
      where.userId = User.id;
    }

    // Filter by mime type
    if(mimeType) {
      where.mimeType = { $in: mimeType.split(',') };
    }

    if(req.query.search) {
      // Search
      fetch = models.upload.search(req.query.search, {
        where: where,
        include: [
          {
            model: models.user,
            as: 'author',
            attributes: { exclude: ['password', 'resetToken'] }
          }
        ],
        limit: count,
        offset: offset
      });
    } else {
      // No search
      fetch = models.upload
        .findAndCountAll({
          where: where,
          include: [
            {
              model: models.user,
              as: 'author',
              attributes: { exclude: ['password', 'resetToken'] }
            }
          ],
          limit: count,
          offset: offset,
          order: [
            ['createdAt', 'DESC']
          ]
        });
    }

    // Fetch uploads
    fetch
      .then((result) => {
        return new Promise((resolve) => {
          // Render the file manager items and return the uploads
          if(req.query.render === 'fileManagerItems') {
            // Render the partial
            res.app.render('admin/partials/file_manager_items', {
              uploads: result.rows
            }, (err, html) => {
              if(err) throw new Error(err);

              resolve({
                totalItems: result.count,
                uploads: result.rows,
                html: html
              });
            });

            return;
          }

          // Just return the tags
          resolve({
            totalItems: result.count,
            uploads: result.rows
          });
        });
      })
      .then((json) => res.json(json))
      .catch((err) => next(err));
  },

  //
  // Creates an upload.
  //
  //  file* - A file to be uploaded as multipart/form-data.
  //
  // Returns a JSON response:
  //
  //  { upload: {} }
  //  { message: '' }
  //
  create: (req, res, next) => {
    const I18n = req.app.locals.I18n;
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;
    const upload = UploadMiddleware.getMulter({
      allowedTypes: [
        // Archives
        'application/zip',

        // Documents
        'application/msword',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'text/csv',
        'text/markdown',
        'text/plain',

        // Images
        'image/gif',
        'image/jpeg',
        'image/png',
        'image/svg+xml'
      ],
      destination: function() {
        let month = Moment().format('MM');
        let year = Moment().format('YYYY');
        return Path.join(__basedir, 'uploads', year, month);
      },
      overwrite: false
    }).single('file');

    // Call the upload middleware
    upload(req, res, (err) => {
      if(err) {
        return res.status(HttpCodes.BAD_REQUEST).json({
          message: err.message
        });
      }

      // Were any files uploaded?
      if(!req.file) {
        return res.status(HttpCodes.BAD_REQUEST).json({
          message: I18n.term('nothing_was_uploaded')
        });
      }

      let file = {
        userId: User.id,
        filename: req.file.filename,
        // Extension should be lowercase and without a dot
        extension: Path.extname(req.file.filename).toLowerCase().replace(/^\./, ''),
        // Path should be relative to the base dir. Example: /uploads/2017/01/image.png
        path: req.file.path.substring(__basedir.length),
        mimeType: req.file.mimetype,
        size: req.file.size,
        width: null,
        height: null
      };

      // Process images (all but SVG)
      if(['image/gif', 'image/jpeg', 'image/png'].includes(req.file.mimetype)) {
        // Load the image
        Gm(req.file.path)
          // Adjust orientation
          .autoOrient()
          // Strip exif data
          .noProfile()
          // Save to file
          .write(req.file.path, (err) => {
            if(err) {
              res.status(HttpCodes.BAD_REQUEST);
              return next(I18n.term('sorry_but_i_cant_seem_to_process_this_image'));
            }

            // Get the image's dimensions
            Gm(req.file.path).size((err, info) => {
              if(err) {
                res.status(HttpCodes.BAD_REQUEST);
                return next(I18n.term('sorry_but_i_cant_seem_to_process_this_image'));
              }

              // Set dimensions
              file.width = info.width;
              file.height = info.height;

              // Get updated file size since stripping exif data likely changed it
              file.size = Fs.statSync(req.file.path).size;

              // Add it to the database and send a response
              models.upload
                .create(file)
                .then((upload) => res.json({ upload: upload }))
                .catch(() => {
                  res.status(HttpCodes.BAD_REQUEST);
                  return next(I18n.term('sorry_but_i_cant_seem_to_process_this_image'));
                });
            });
          });
      } else {
        // Nope, add it to the database and send a response
        models.upload
          .create(file)
          .then((upload) => res.json({ upload: upload }))
          .catch(() => {
            res.status(HttpCodes.BAD_REQUEST);
            next(I18n.term('sorry_but_i_cant_seem_to_process_this_image'));
          });
      }
    });
  },

  //
  // Gets an upload and instructs the client to download the file.
  //
  // Returns a file.
  //
  download: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;
    let where = { id: req.params.id };

    models.upload
      .findOne({
        where: where
      })
      .then((upload) => {
        // Not found
        if(!upload) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Upload Not Found');
        }

        // All uploads for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && upload.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Set download headers
        res.setHeader('Content-disposition', 'attachment; filename=' + upload.filename);
        res.setHeader('Content-type', upload.mimeType);

        // Stream the download
        let stream = Fs.createReadStream(Path.join(__basedir, upload.path));
        stream.pipe(res);
      })
      .catch((err) => next(err));
  },

  //
  // Gets an upload.
  //
  // Returns a JSON response:
  //
  //  { upload: {} }
  //
  read: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    models.upload
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((upload) => {
        // Not found
        if(!upload) {
          res.status(HttpCodes.NOT_FOUND);
          throw new Error('Upload Not Found');
        }

        // All uploads for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && upload.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        res.json({
          upload: upload
        });
      })
      .catch((err) => next(err));
  },

  //
  // Updates an upload.
  //
  // NOTE: There is no functional update method for uploads. All properties are generated from the
  // original file (filename, extension, path, mimeType, size, width, and height), which makes them
  // effectively read-only. If you need to "replace" an upload, use delete + create.
  //
  // Always returns a Method Not Allowed response.
  //
  update: function(req, res) {
    return res.status(HttpCodes.METHOD_NOT_ALLOWED);
  },

  //
  // Deletes an upload.
  //
  //  id* (string) - An upload id.
  //
  // Returns a JSON response:
  //
  //  { deleted: true }
  //
  delete: function(req, res, next) {
    const User = req.User;
    const models = req.app.locals.Database.sequelize.models;

    // Fetch the upload
    models.upload
      .findOne({
        where: {
          id: req.params.id
        }
      })
      .then((upload) => {
        // Not found
        if(!upload) {
          if(!upload) {
            res.status(HttpCodes.NOT_FOUND);
            throw new Error('Upload Not Found');
          }
        }

        // All uploads for owners/admins/editors, only yours for contributors
        if(!['owner', 'admin', 'editor'].includes(User.role) && upload.userId !== User.id) {
          res.status(HttpCodes.UNAUTHORIZED);
          throw new Error('Unauthorized');
        }

        // Delete related cache files which are prefixed by SHA256(path)
        let pathHash = Crypto.createHash('sha256').update(upload.path).digest('hex').substring(0, 10);
        Del(Path.join(__basedir, 'cache/images/' + pathHash + '.*'));

        // Delete the file
        Fs.unlink(Path.join(__basedir, upload.path), () => {
          // Remove it from the database
          upload.destroy().then(() => {
            res.json({
              deleted: true
            });
          });
        });
      })
      .catch((err) => next(err.message));
  }

};

module.exports = self;
