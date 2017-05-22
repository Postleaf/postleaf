'use strict';

// Node modules
const Cheerio = require('cheerio');
const Crypto = require('crypto');
const Extend = require('extend');
const Fs = require('fs');
const Gm = require('gm');
const HttpCodes = require('http-codes');
const Mkdirp = require('mkdirp');
const Mime = require('mime');
const Path = require('path');
const Promise = require('bluebird');
const Url = require('url');

// Local modules
const SignedUrl = require(Path.join(__basedir, 'source/modules/signed_url.js'));

const self = {

  //
  // Generates a dynamic image URL if possible. Ignores URLs that resolve to other hostnames.
  //
  //  url* (string) - The URL of the target image.
  //  params* (object) - One or more properties to append to the query string. These properties will
  //    be passed to the processImages middleware when the image is requested.
  //
  generateUrl: (url, params) => {
    params = params || {};
    let hostname = Url.parse(process.env.APP_URL).hostname;
    let parsed = Url.parse(url, true);

    // Don't modify URLs that point to other hostnames
    if(parsed.hostname && parsed.hostname !== hostname) {
      return url;
    }

    // Append params to query string
    Object.keys(params).forEach((key) => {
      if(parsed.search.length) parsed.search += '&';
      parsed.search += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    });
    parsed.search = parsed.search.replace(/^&/, '');
    url = Url.format(parsed);

    // Generate a signed URL
    return SignedUrl.sign(url, process.env.AUTH_SECRET);
  },

  //
  // Parses an HTML string and injects srcset attributes with dynamic images every 200px.
  //
  //  html* (string) - An HTML string of content.
  //  uploadModel* (object) - A reference to the upload model.
  //
  // Returns a promise that resolves an HTML string.
  //
  injectSrcset(html, uploadModel) {
    return new Promise((resolve, reject) => {
      let $ = Cheerio.load(html);
      let queue = [];

      // Find each image in the content
      $('img').each((index, el) => {
        let src = $(el).attr('src') || '';
        let path = Url.parse(src).pathname;
        let srcset = [];

        // Skip images that aren't in the uploads folder
        if(!path || !path.match(/^\/uploads\//)) return;

        queue.push(
          // Find the original image
          uploadModel
            .findOne({
              where: { path: src }
            })
            .then((upload) => {
              // Do nothing if no image exists or if it's less than 200px wide
              if(!upload || upload.width < 200) return;

              // Create dynamic images at 200px intervals up to the original width
              for(let width = 200; width < upload.width; width += 200) {
                let url = SignedUrl.sign(src + '?width=' + width, process.env.AUTH_SECRET);
                srcset.push(url + ' ' + width + 'w');
              }

              // Inject srcset
              $(el).attr('srcset', srcset.join(', '));
            })
          );
      });

      // Wait for the queue to finish
      Promise.all(queue)
        // Send back the updated HTML
        .then(() => resolve($.html()))
        .catch((err) => reject(err));
    });
  },

  //
  // Middleware that intercepts static image requests, dynamically processes them based on query
  // params, and caches them for optimal performance.
  //
  // Query params:
  //
  //  width (int) - Resize proportionally to fit inside this this width.
  //  height (int) - Resize proportionally to fit inside this height.
  //  crop (string) - The crop coordinates after resizing occurs. Use: '{x1},{y1},{x2},{y2}'
  //  thumbnail (int|string) - Creates a thumbnail of the exact size. Use: '{width}' or
  //    '{width},{height}'
  //  rotate (int) - The angle of rotation, from 0 to 360.
  //  flip (string) - Flip the image horizontally or vertically. Use: 'h', 'v', or 'both'
  //  grayscale (bool) - Set to true to desaturate the image.
  //  colorize (string) - Colorize the image. Use: `{red},{green},{blue}` where values are 0–100%.
  //  blur (int) - Apply a blur to the image using this argument as the blur radius.
  //  colors (int) - Reduce the image to this many of colors. Uses a dithering effect.
  //  quality (int) - The quality of the resulting image. The higher the quality, the larger the
  //    file size. The lower the quality, the smaller the file size. Quality has no affect on
  //    lossless image formats such as PNG and GIF. Default is 75.
  //
  processImages: (req, res, next) => {
    // Ignore requests outside of the uploads folder
    if(!req.path.match(/^\/uploads\//)) return next();

    // Ignore requests where no query params exist
    if(typeof req.query !== 'object' || Object.keys(req.query).length === 0) return next();

    // Decode the path and get the mime type
    let targetFile = Path.join(__basedir, decodeURI(req.path));
    let mimeType = Mime.lookup(targetFile);

    // Ignore all files that aren't supported raster images
    if(!['image/gif', 'image/jpeg', 'image/png'].includes(mimeType)) return next();

    // Is the URL signed?
    if(!SignedUrl.verify(req.originalUrl, process.env.AUTH_SECRET)) {
      return res.status(HttpCodes.FORBIDDEN).end();
    }

    // Determine cache filename. We use a shortened hash of the path (relative to the app root) so
    // we can cleanup cache files when the original gets deleted.
    //
    // Cache filenames are formatted like this:
    //
    //  pathHash.key.extension
    //
    //  - Where pathHash is the first 10 chars of SHA256(path), and path is relative to the website
    //    root (e.g. '/uploads/2017/03/image.jpg').
    //  - Where key is a key from a signed URL.
    //  - Where extension is the lowercase file extension
    //
    let key = req.query.key || '';
    let extension = Path.extname(targetFile).toLowerCase();
    let pathHash = Crypto.createHash('sha256').update(decodeURI(req.path)).digest('hex').substring(0, 10);
    let cacheFile = Path.join(__basedir, 'cache/images', pathHash + '.' + key + extension);

    // Check for an existing cache file
    Fs.stat(cacheFile, (err) => {
      if(!err) {
        // We have a hit! Send the file from cache.
        res.header('Content-Type', mimeType).sendFile(cacheFile);
        return;
      }

      // Nothing in cache. Does the target file exist?
      Fs.stat(targetFile, (err) => {
        if(err) return next();

        // Process the image
        Promise.resolve(Gm(targetFile))
          // Skip animated images since resize, crop, rotate, etc. produce undesired results. It
          // *is* possible to process animations, but it's very time consuming, memory intensive,
          // and the resulting files are usually much larger than the originals due to the loss of
          // optimizations.
          //
          // See: github.com/Postleaf/postleaf/issues/44
          //
          .then((image) => {
            return new Promise((resolve, reject) => {
              image.identify('%n\n', (err, info) => {
                if(err) reject(err);

                info = info.split('\n');
                let numFrames = parseInt(info[0]);

                if(numFrames > 1) {
                  reject(new Error('Unable to process images with animation.'));
                }

                resolve(image);
              });
            });
          })
          // Resize
          .then((image) => {
            return new Promise((resolve, reject) => {
              if(req.query.width || req.query.height) {
                let width = req.query.width ? parseInt(req.query.width) : null;
                let height = req.query.height ? parseInt(req.query.height) : null;

                // Determine the image's current size
                image.size((err, size) => {
                  if(err) return reject(err);

                  // Only resize if requested dimensions are smaller than the original
                  if(width < size.width && height < size.height) {
                    image.resize(width, height);
                  }

                  resolve(image);
                });
              } else {
                resolve(image);
              }
            });
          })
          // Crop
          .then((image) => {
            if(req.query.crop) {
              let crop = req.query.crop.split(',');
              let x1 = parseInt(crop[0]);
              let y1 = parseInt(crop[1]);
              let x2 = parseInt(crop[2]);
              let y2 = parseInt(crop[3]);
              let cropWidth = Math.abs(x2 - x1);
              let cropHeight = Math.abs(y2 - y1);
              let x = Math.min(x1, x2);
              let y = Math.min(y1, y2);

              if(cropWidth > 0 && cropHeight > 0) {
                image.crop(cropWidth, cropHeight, x, y);
              }
            }

            return image;
          })
          // Thumbnail
          .then((image) => {
            return new Promise((resolve, reject) => {
              if(req.query.thumbnail) {
                let args = req.query.thumbnail.split(',');
                let width = args[0] ? parseInt(args[0]) : null;
                let height = args[1] ? parseInt(args[1]) : width;

                if(!width && !height) return resolve(image);

                // Determine the image's current size
                image.size((err, size) => {
                  if(err) return reject(err);

                  if(size.width < size.height) {
                    // Resize to width and crop to the desired height
                    image
                      .resize(width, null)
                      .gravity('Center')
                      .crop(width, height);
                  } else {
                    // Resize to height and crop to desired width
                    image
                      .resize(null, height)
                      .gravity('Center')
                      .crop(width, height);
                  }

                  resolve(image);
                });
              } else {
                resolve(image);
              }
            });
          })
          // Rotate
          .then((image) => {
            if(req.query.rotate) {
              let angle = parseInt(req.query.rotate);

              if(angle > 0 && angle < 360) {
                image.rotate('transparent', angle);
              }
            }

            return image;
          })
          // Flip
          .then((image) => {
            switch(req.query.flip) {
            case 'h':
              image.flop();
              break;
            case 'v':
              image.flip();
              break;
            case 'both':
              image.flip().flop();
              break;
            }

            return image;
          })
          // Grayscale
          .then((image) => {
            if(req.query.grayscale) {
              image.type('Grayscale');
            }

            return image;
          })
          // Colorize
          .then((image) => {
            if(req.query.colorize) {
              let rgb = req.query.colorize.split(',');
              let red = 100 - (parseInt(rgb[0]) || 0);
              let green = 100 - (parseInt(rgb[1]) || 0);
              let blue = 100 - (parseInt(rgb[2]) || 0);

              if(
                red >= 0 && red <= 100 &&
                green >= 0 && green <= 100 &&
                blue >= 0 && blue <= 100
              ) {
                image.colorize(red, green, blue);
              }
            }

            return image;
          })
          // Blur
          .then((image) => {
            if(req.query.blur) {
              let radius = parseInt(req.query.blur);

              if(radius > 0) {
                image.blur(0, radius);
              }
            }

            return image;
          })
          // Colors
          .then((image) => {
            if(req.query.colors) {
              let colors = parseInt(req.query.colors);

              if(colors > 0) {
                image.colors(colors);
              }
            }

            return image;
          })
          // Quality
          .then((image) => {
            if(req.query.quality) {
              let quality = parseInt(req.query.quality);

              if(quality >= 1 && quality <= 100) {
                image.quality(quality);
              }
            }

            return image;
          })
          // Write and serve the image to cache
          .then((image) => {
            // Create the cache directory if it doesn't exist
            Mkdirp.sync(Path.dirname(cacheFile));

            // Write the cache file
            image.write(cacheFile, (err) => {
              if(err) throw new Error(err);
              res.header('Content-Type', mimeType).sendFile(cacheFile);
              return;
            });
          })
          // Something went wrong, fallback and serve the static image
          .catch(() => next());
      });
    });
  }

};

module.exports = self;
