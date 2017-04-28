'use strict';

// Node modules
const Autolinker = require('autolinker');
const Cheerio = require('cheerio');
const He = require('he');
const Oembed = require('oembed');
const Path = require('path');
const Promise = require('bluebird');
const Url = require('url');

const self = {

  //
  // Parses text or HTML and turns links into embedded objects.
  //
  //
  //  html* (string) - The HTML to parse.
  //  options (object)
  //    - hostname (string) - The current hostname. Used for converting URLs and requesting oEmbeds.
  //
  // Returns a promise that resolves with an HTML string.
  //
  parse: (html, options) => {
    options = options || {};

    return new Promise((resolve, reject) => {
      // Parse HTML to find URLs
      html = Autolinker.link(html, {
        newWindow: false,
        email: false,
        phone: false,
        truncate: {
          length: 32,
          location: 'middle'
        },
        replaceFn: function(match) {
          // Parse the URL
          let url = match.getUrl();
          let parsed = Url.parse(url);
          let extension = Path.extname(parsed.pathname);

          // Is it a local URL? If so, make it root relative
          if(parsed.hostname === options.hostname) {
            url = parsed.pathname + (parsed.search || '') + (parsed.hash || '');
          }

          switch(match.getType()) {
          case 'url':
            if(extension.match(/^\.(gif|jpeg|jpg|png|svg)$/i)) {
              // Embed an image
              return '\n' +
                '<figure class="image">' +
                '<img src="' + He.encode(url, { useNamedReferences: true }) + '">' +
                '</figure>' +
                '\n';
            } else {
              // Embed other URLs. Since this method doesn't support promises, we'll create a
              // placeholder element that we can easily parse afterwards.
              return '\n' +
                '<span data-auto-embed="' + He.encode(url, { useNamedReferences: true }) + '"></span>' +
                '\n';
            }
          default:
            return false;
          }
        }
      });

      // Convert oEmbed URLs
      let $ = Cheerio.load(html);
      let queue = [];

      // Get a list of oembed URLs
      $('[data-auto-embed]').each(function() {
        let url = $(this).attr('data-auto-embed');

        queue.push(
          new Promise((resolve) => {
            Oembed.fetch(url, { for: options.hostname }, (err, result) => {
              resolve(err ? null : result);
            });
          })
        );
      });

      // Fetch embed code for all oembed links
      Promise.all(queue)
        .then((result) => {
          $('[data-auto-embed]').each(function(index) {
            if(result[index]) {
              // Insert the embed code
              $(this).replaceWith(
                '<div data-embed="true" data-embed-provider="' +
                He.encode(result[index].provider_name, { useNamedReferences: true }) +
                '">' +
                result[index].html +
                '</div>'
              );
            } else {
              // No oembed provider found, revert to to the original URL
              $(this).replaceWith($(this).attr('data-auto-embed'));
            }
          });

          // Return the updated HTML
          resolve($.html());
        })
        .catch((err) => reject(err));
    });
  }

};

module.exports = self;
