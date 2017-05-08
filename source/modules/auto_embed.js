'use strict';

// Node modules
const Autolinker = require('autolinker');
const Cheerio = require('cheerio');
const He = require('he');
const Path = require('path');
const Promise = require('bluebird');
const Url = require('url');

// Local modules
const MetaphorEngine = require(Path.join(__basedir, 'source/modules/metaphor_engine.js'));

const self = {

  //
  // Parses text or HTML and turns links into embedded objects.
  //
  //
  //  html* (string) - The HTML to parse.
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
        const engine = MetaphorEngine.create();
        let url = $(this).attr('data-auto-embed');

        // Fetch metadata for each URL
        queue.push(
          new Promise((resolve) => {
            engine.describe(url, (description) => resolve(description));
          })
        );
      });

      // Convert URLs to embed code
      Promise.all(queue)
        .then((result) => {
          $('[data-auto-embed]').each(function(index) {
            let embed;

            if(result[index].embed && result[index].embed.html) {
              // An embed provider was found, insert the HTML
              embed = result[index].embed.html;
            } else {
              // No embed provider, insert a preview instead
              embed = result[index].preview;
            }

            // Swap out the placeholder element with the embed code
            $(this).replaceWith(
              '<div data-embed="true" data-embed-provider="' +
              He.encode(result[index].site_name, { useNamedReferences: true }) +
              '">' + embed + '</div>'
            );
          });

          // Return the updated HTML
          resolve($.html());
        })
        .catch((err) => reject(err));
    });
  }

};

module.exports = self;
