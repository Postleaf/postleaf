'use strict';

// Node modules
const Metaphor = require('metaphor');
const Url = require('url');

module.exports = {

  //
  // Fetches metadata, oEmbed data, and a preview of the given URL.
  //
  // Returns a JSON response with a Metaphor description object.
  //
  // Details: https://github.com/hueniverse/metaphor
  //
  getFromProvider: (req, res) => {
    const engine = new Metaphor.Engine({
      // Use a custom preview template
      preview: (description, options, callback) => {
        let url = description.url;
        let parsed = Url.parse(url);
        let prettyUrl = parsed.hostname + (parsed.pathname || '').replace(/\/$/, '');
        let siteName = res.site_name;
        let title = description.title || '';
        let content = description.description || '';
        let icon = description.icon ? description.icon.any : '';
        let image = description.image;

        // Image can be an object or an array of objects
        if(image && image.url) {
          image = image.url;
        } else if(Array.isArray(image)) {
          image = image[0].url;
        }

        // Embed card template
        let html = `
          <aside class="embed-card">
            <article>
              ${image ? `<img src="${image}">` : ''}
              ${title ? `<h3><a href="${url}">${title}</a></h3>` : ''}
              ${content ? `<p>${content}</p>` : ''}
            </article>
            <footer>
              ${icon ? `<img src="${icon}">` : ''}
              <a href="${url}">${siteName  ? siteName  : prettyUrl}</a>
            </footer>
          </aside>
        `;

        return callback(html.replace(/\n\s+/g, ''));
      }
    });

    // Fetch metadata and send a response
    engine.describe(req.query.url, (description) => res.json(description));
  }

};
