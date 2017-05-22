'use strict';

// Node modules
const Url = require('url');

//
// Builds a query string from an object or string.
//
// Returns a string.
//
function appendQueryString(url, params) {
  let queryString = '';

  // Start the query string or append to the existing one
  queryString += url.indexOf('?') === -1 ? '?' : '&';

  if(params && typeof(params) === 'object') {
    for(let key in params) {
      queryString +=
        encodeURIComponent(key) + '=' +
        encodeURIComponent(params[key]) + '&';
    }
    queryString = queryString.replace(/&$/, '');
  } else if(typeof(params) === 'string') {
    queryString += params;
  }

  return url + queryString;
}

module.exports = (Settings) => {

  const self =  {
    //
    // Converts a relative URL to an absolute URL. If an absolute URL is passed, it will be returned
    // unmodified.
    //
    absolute: (url) => {
      let parsed = Url.parse(url);

      // Skip absoulte URLs and URLs where the path is empty
      if(!parsed.hostname && parsed.path) {
        url = process.env.APP_URL.replace(/\/$/, '') + '/' + parsed.path.replace(/^\//, '');
      }

      return url;
    },

    //
    // Generates an admin URL. This method accepts two argument signatures: (path, options) or
    // (options)
    //
    //  path (string) - A path to append to the URL.
    //  options (object)
    //    - query (string|object) - Optional query string to append to the URL
    //    - hash - Optional hash to append to the URL
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    admin: (path, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof path === 'object') {
        options = path;
        path = options.path;
      }

      let url = '/' + process.env.APP_ADMIN_SLUG;
      if(path) url += '/' + encodeURI(path || '').replace(/^\/+/, '');
      if(options.query) url = appendQueryString(url, options.query);
      if(options.hash) url += '#' + options.hash;

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates an API URL. This method accepts two argument signatures: (path, options) or
    // (options)
    //
    //  path (string) - A path to append to the URL.
    //  options (object)
    //    - query (string|object) - Optional query string to append to the URL
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    api: (path, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof path === 'object') {
        options = path;
        path = options.path;
      }

      let url = '/' + process.env.APP_API_SLUG;
      if(path) url += '/' + encodeURI(path || '').replace(/^\/+/, '');
      if(options.query) url = appendQueryString(url, options.query);

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates an author URL. This method accepts two argument signatures: (username, options) or
    // (username)
    //
    //  username* (string) - The author's username.
    //  options (object)
    //    - page (int) - Optional page number to link to.
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    author: (username, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof username === 'object') {
        options = username;
        username = options.username;
      }

      if(typeof username === 'undefined') throw new Error('Missing argument `username` MakeUrl.author().');
      let url = '/' + process.env.APP_AUTHOR_SLUG + '/' + encodeURIComponent(username);
      if(options.page > 1) url += '/' + process.env.APP_PAGE_SLUG + '/' + options.page;

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a blog URL.
    //
    //  options (object)
    //    - page (int) - Optional page number to link to.
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    blog: (options) => {
      options = options || {};
      let url = Settings.homepage ? '/' + process.env.APP_BLOG_SLUG : '/';
      if(options.page > 1) url = url.replace(/\/+$/, '') + '/' + process.env.APP_PAGE_SLUG + '/' + options.page;

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a feed URL.
    //
    //  options (object)
    //    - format (string) - Either 'rss' or 'json' (default 'rss').
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    feed: (options) => {
      options = options || {};
      let format = options.format === 'json' ? 'json' : 'rss';
      let url = '/' + process.env.APP_FEED_SLUG + '/' + format;

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a post URL. This method accepts two argument signatures: (path, options) or
    // (options)
    //
    //  slug (string) - The post's slug.
    //  options (object)
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    post: (slug, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof slug === 'object') {
        options = slug;
        slug = options.slug;
      }

      if(typeof slug === 'undefined') throw new Error('Missing argument `slug` MakeUrl.post().');
      let url = '/' + encodeURIComponent(slug);

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a raw URL. If a fully-qualified URL is passed in, it will be returned unmodified.
    // This method accepts two argument signatures: (path, options) or (options)
    //
    //  path (string) - A path to append to the URL.
    //  options (object)
    //    - query (string|object) - Optional query string to append to the URL.
    //    - hash (string) - Optional hash to append to the URL.
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    raw: (path, options) => {
      options = options || {};

      // Normalize arguments when only an object is passed in
      if(typeof path === 'object') {
        options = path;
        path = options.path;
      }

      // Don't modify full-qualified URLs or hashes
      if(typeof path === 'string' && path.match(/^(http|https|mailto|#):/i)) {
        return path;
      }

      options = options || {};
      let url = '/' + encodeURI(path || '').replace(/^\/+/, '');
      if(options.query) url = appendQueryString(url, options.query);
      if(options.hash) url += '#' + options.hash;

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a search URL. This method accepts two argument signatures: (path, options) or
    // (options)
    //
    //  search (string) - A search term.
    //  options (object)
    //    - page (int) - Optional page number to link to.
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    search: (search, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof search === 'object') {
        options = search;
        search = options.search;
      }

      let url = '/' + process.env.APP_SEARCH_SLUG;
      if(options.page > 1 && search) url += '/' + process.env.APP_PAGE_SLUG + '/' + options.page;
      if(search) url += '?s=' + encodeURIComponent(search);

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a tag URL. This method accepts two argument signatures: (path, options) or
    // (options)
    //
    //  slug* (string) - The tags's slug.
    //  options (object)
    //    - page (int) - Optional page number to link to.
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    tag: (slug, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof slug === 'object') {
        options = slug;
        slug = options.slug;
      }

      if(typeof slug === 'undefined') throw new Error('Missing argument `slug` MakeUrl.tag().');
      let url = '/' + process.env.APP_TAG_SLUG + '/' + encodeURIComponent(slug);
      if(options.page > 1) url += '/' + process.env.APP_PAGE_SLUG + '/' + options.page;

      return options.absolute ? self.absolute(url) : url;
    },

    //
    // Generates a URL for the current theme. This method accepts two argument signatures:
    // (path, options) or (options)
    //
    //  path (string) - A path to append to the URL.
    //  options (object)
    //    - themeId (string) - The ID of the theme (defaults to the current theme).
    //    - absolute (bool) - Set to true to return an absolute URL.
    //
    theme: (path, options) => {
      options = options || {};

      // Normalize arguments if only an object was passed in
      if(typeof path === 'object') {
        options = path;
        path = options.path;
      }

      let url = '/themes/' + (options.themeId || Settings.theme);
      if(path) url += '/' + encodeURI(path || '').replace(/^\/+/, '');

      return options.absolute ? self.absolute(url) : url;
    }

  };

  return self;

};
