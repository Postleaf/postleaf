'use strict';

// Node modules
const FormatNumber = require('format-number');
const He = require('he');
const Moment = require('moment');
const Striptags = require('striptags');
const Path = require('path');
const Url = require('url');

// Local modules
const Markdown = require(Path.join(__basedir, 'source/modules/markdown.js'));

module.exports = (dust) => {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Filters
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //
  // Converts HTML to plain text.
  //
  dust.filters.htmlToText = (value) => {
    return Striptags(value);
  };

  //
  // Converts Markdown to HTML.
  //
  dust.filters.markdownToHtml = (value) => {
    return Markdown.toHtml(value);
  };

  //
  // Converts Markdown to plain text.
  //
  dust.filters.markdownToText = (value) => {
    return Markdown.toText(value);
  };

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Helpers
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //
  // Outputs a date/time in the specified format.
  //
  // Attributes:
  //
  //  - date - the date to output. If omitted, the current date and time will be used.
  //  - format - the format to use to output the date. Format can be any format supported by
  //    Moment.js (https://momentjs.com/docs/#/displaying/). If omitted, 'YYYY-MM-DD HH:mm:ss' will
  //    be used.
  //  - relative - Set to true to output a relative date (e.g. "7 days ago").
  //  - timeZone - the time zone to convert the date to. If omitted, the time zone configured in
  //    settings will be used.
  //
  // Examples:
  //
  //  {@date date=publishedAt format="YYYY-MM-DD"/}
  //  {@date date="2017-01-02 12:00:00" format="ddd, hA"/}
  //  {@date date=publishedAt format="relative"/}
  //
  dust.helpers.date = (chunk, context, bodies, params) => {
    const I18n = context.options.locals.I18n;
    const Settings = context.options.locals.Settings;
    let locale = I18n.term('momentjs_locale', { type: 'meta' });
    let date = params.date ? new Moment(context.resolve(params.date)) : new Moment();
    let format = context.resolve(params.format) || 'YYYY-MM-DD HH:mm:ss';
    let relative = context.resolve(params.relative) === 'true';
    let timeZone = context.resolve(params.timeZone) || Settings.timeZone;

    // Set locale
    date.locale(locale);

    if(relative) {
      return chunk.write(date.tz(timeZone).fromNow());
    } else {
      return chunk.write(date.tz(timeZone).format(format));
    }
  };

  //
  // Compares two dates.
  //
  // Attributes:
  //
  //  - key - The first date to compare.
  //  - value - The second date to compare.
  //  - operand - The type of comparison to perform. Can be <, <=, >, >=, between, or = (default).
  //
  // Examples:
  //
  //  {@dateCompare key=publishedAt operand="<" value="now"}
  //    Date is in the past.
  //  {:else}
  //    Date is in the future.
  //  {/dateCompare}
  //
  //  {@dateCompare key=publishedAt operand="between" start="2016-01-01" end="2016-12-31"}
  //    ...
  //  {/dateCompare}
  //
  // Notes:
  //
  //  - Dates format should be a supported ISO 8601 string: https://momentjs.com/docs/#/parsing/
  //  - You can use 'now' to indicate the current date/time.
  //
  dust.helpers.dateCompare = (chunk, context, bodies, params) => {
    let key = context.resolve(params.key);
    let value = context.resolve(params.value);
    let start = context.resolve(params.start);
    let end = context.resolve(params.end);
    let operand = context.resolve(params.operand);
    let result;

    key = Moment(key === 'now' ? undefined : key);
    value = Moment(value === 'now' ? undefined : value);
    start = Moment(start === 'now' ? undefined : start);
    end = Moment(end === 'now' ? undefined : end);

    switch(operand) {
    case '<':
      result = key.isBefore(value);
      break;
    case '<=':
      result = key.isSameOrBefore(value);
      break;
    case '>':
      result = key.isAfter(value);
      break;
    case '>=':
      result = key.isSameOfAfter(value);
      break;
    case 'between':
      result = key.isBetween(start, end);
      break;
    default: // =
      result = key.isSame(value);
      break;
    }

    // Handle result
    if(result) {
      chunk = chunk.render(bodies.block, context);
    } else if(bodies['else']) {
      chunk = chunk.render(bodies['else'], context);
    }

    return chunk;
  };

  //
  // Formats bytes into a more readable format.
  //
  // Attributes:
  //
  //  - bytes - the target size in bytes.
  //
  // Examples:
  //
  //  {@formatBytes bytes="32000000"/} ==> 32MB
  //
  dust.helpers.formatBytes = (chunk, context, bodies, params) => {
    let bytes = context.resolve(params.bytes);
    let sizes = [' bytes', ' KB', ' MB', ' GB', ' TB'];
    if(bytes < 1) return '0';
    let index = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

    return chunk.write(Math.round(bytes / Math.pow(1024, index), 2) + sizes[index]);
  };

  //
  // Formats a number.
  //
  // Attributes:
  //
  //  - number - the target number.
  //  - places - number of decimal places to use (default 0).
  //  - decimal - the decimal separator (default .).
  //  - thousands - the thousands separator (default ,).
  //
  // Examples:
  //
  //  {@formatNumber number="25000"/}
  //  {@formatNumber number="50.75" places="2"/}
  //  {@formatNumber number="25000" decimal="," thousands=" "/}
  //
  dust.helpers.formatNumber = (chunk, context, bodies, params) => {
    const I18n = context.options.locals.I18n;
    let number = parseFloat(context.resolve(params.number) || 0);
    let places = parseInt(context.resolve(params.places) || 0);
    let decimal = context.resolve(params.decimal) || I18n.term('decimal', { type: 'symbol' });
    let thousands = context.resolve(params.thousands) || I18n.term('thousands', { type: 'symbol' });

    return chunk.write(
      FormatNumber({
        integerSeparator: thousands,
        decimal: decimal,
        truncate: places
      })(number)
    );
  };

  //
  // Formats a URL based on the specified arguments. If no arguments are set, only the hostname will
  // be displayed.
  //
  // Attributes:
  //
  //  - url - the URL to format.
  //  - protocol - set to true to show the protocol, e.g. https:// (default false).
  //  - hostname - set to true to output the hostname (default true).
  //  - path - set to true to output the path (default false).
  //  - search - set to true to output the query (search) string, e.g. ?page=2 (default false).
  //  - hash - set to true to output the hash, e.g. #hash (default false).
  //
  // Examples:
  //
  //  {@formatUrl url="https://example.com/"/}
  //    ==> example.com
  //  {@formatUrl url="https://example.com/path/to/page.html" path="true" /}
  //    ==> example.com/path/to/page.html
  //
  dust.helpers.formatUrl = (chunk, context, bodies, params) => {
    let url = context.resolve(params.url) || '';
    let protocol = context.resolve(params.protocol) === 'true';
    let hostname = context.resolve(params.hostname) !== 'false';
    let path = context.resolve(params.path) === 'true';
    let search = context.resolve(params.search) === 'true';
    let hash = context.resolve(params.hash) === 'true';
    let parsed = Url.parse(url);

    // Rebuild the URL with the desired components
    url = '';
    if(protocol) url += parsed.protocol + '//';
    if(hostname) url += parsed.hostname;
    if(path) url += parsed.path;
    if(search) url += parsed.search;
    if(hash) url += parsed.hash;

    return chunk.write(url);
  };

  //
  // Outputs a localized language term.
  //
  // Attributes:
  //
  //  - term - the key of the desired language term.
  //  - type - the type of key. Can be term (default), symbol, or meta.
  //  - [placeholders] - If a term has a [placeholder], you can set its value by adding an attribute
  //    with the same name as the placeholder.
  //
  // Examples:
  //
  //  {@i18n term="term"/}
  //  {@i18n term="term_with_[this]_[that]" this="place" that="holders"/}
  //  {@i18n term="decimal" type="symbol"/}
  //  {@i18n term="thousands" type="symbol"/}
  //  {@i18n term="name" type="meta"}
  //  {@i18n term="term_with_[this]" this="<code>HTML</code>" allowHtml="true"/}
  //
  dust.helpers.i18n = (chunk, context, bodies, params) => {
    const I18n = context.options.locals.I18n;
    let placeholders = [];
    let term = context.resolve(params.term);
    let type = context.resolve(params.type);
    let allowHtml = context.resolve(params.allowHtml) === 'true';

    // Attach
    for(let i in params) {
      // Skip known attributes
      if(i.match(/^(term|symbol|meta)$/)) continue;

      // Assume all other attributes are placeholders
      placeholders[i] = params[i];
    }

    term = I18n.term(term, {
      type: type || 'term',
      placeholders: placeholders
    });

    // Escape HTML by default
    if(!allowHtml) {
      term = He.encode(term, { useNamedReferences: true });
    }

    return chunk.write(term);
  };

  //
  // Checks an array or a CSV string for the given value.
  //
  // Attributes:
  //
  //  - key - the key to check for.
  //  - value - the values to check. Can be an array or a comma-separated string.
  //
  // Examples:
  //
  //  {@in key=User.role value="editor,contributor,admin"}
  //    Key is in value
  //  {:else}
  //    Key is not in value
  //  {/in}
  //
  dust.helpers.in = (chunk, context, bodies, params) => {
    let key = context.resolve(params.key);
    let value = context.resolve(params.value);

    // Split strings to CSV and strim
    if(typeof value === 'string') value = value.split(',');

    // Cast to array
    if(!Array.isArray(value)) value = [value];

    // No match, do else
    if(!value.includes(key)) {
      if(bodies['else']) {
        chunk = chunk.render(bodies['else'], context);
      }
      return chunk;
    }

    chunk = chunk.render(bodies.block, context);

    return chunk;
  };

  //
  // Returns a plural or non-plural string based on a number.
  //
  // Attributes:
  //
  //  - count - the target count.
  //  - none - the output when count is zero.
  //  - one - the output when count is one.
  //  - many - the output when count is greater than one. Use % as a placeholder for count.
  //
  // Examples:
  //
  //  {@plural count="2" none="No posts" one="One post" many="% posts"/}
  //
  dust.helpers.plural = (chunk, context, bodies, params) => {
    let count = parseInt(context.resolve(params.count));
    let output = context.resolve(params.many) || '';
    if(count === 0) output = context.resolve(params.none) || '';
    if(count === 1) output = context.resolve(params.one) || '';

    return chunk.write(output.replace(/%/g, count));
  };

  //
  // Outputs the current Postleaf version number.
  //
  // Attributes: none
  //
  // Examples:
  //
  //  {@postleafVersion/}
  //
  dust.helpers.postleafVersion = (chunk) => {
    return chunk.write(__version);
  };

  //
  // Truncates text after a certain number of characters or words.
  //
  // Attributes:
  //
  //  - text - the text to truncate.
  //  - chars - the max number of characters to output (default 140). Only used if words isn't set.
  //  - words - the max number of words to output.
  //  - append - optional string to append if the text is longer than the max (default …)
  //
  // Examples:
  //
  //  {@truncateWords text="Lorem ipsum..." chars="140"/}
  //  {@truncateWords text="Lorem ipsum..." words="20" append="…"/}
  //
  dust.helpers.truncateWords = (chunk, context, bodies, params) => {
    let text = context.resolve(params.text);
    let chars = parseInt(context.resolve(params.chars)) || 140;
    let words = parseInt(context.resolve(params.words));
    let append = context.resolve(params.append) || '…';
    let output;

    if(words) {
      // Limit by words
      output = text.split(' ').splice(0, words).join(' ');
      if(text.split(' ').length > words) output += append;
    } else {
      // Limit by chars
      output = text.substring(0, chars);

      // Stop at last space before the limit
      if(text.length > chars && text.substring(chars - 1, chars) !== ' ') {
        output = output.substring(0, output.lastIndexOf(' '));
      }

      // Trim whitespace
      output = output.replace(/ +$/, '');

      if(output.length < text.length) output += append;
    }

    return chunk.write(output);
  };

  //
  // Generates a URL. You should always use this helper when outputting URLs. This is the only way
  // to guarantees that URLs will be correct when themes, settings, or environmental variables
  // change.
  //
  // Attributes:
  //
  //  - type – the type of URL to generate (default raw).
  //    - admin – generates a URL to the admin panel.
  //    - api – generates a URL to the API.
  //    - author – generates a URL to an author page. Set the page attribute to link to a specific
  //      page.
  //    - blog – generates a link to the blog. The blog URL will not be the same as the homepage if
  //      a custom homepage is used. Set the page attribute to link to a specific page.
  //    - feed – generates a feed URL. Set the format attribute to json or rss (default) to change
  //      the feed format.
  //    - post – generates a post URL. The slug attribute is required for this type of URL.
  //    - raw – generates a raw URL to the website.
  //    - search – generates a URL to a search page. Set the page attribute to link to a specific
  //      page. Set the search attribute to set a search query.
  //    - tag – generates a link to a tag page. The slug attribute is required for this type of URL.
  //      Set the page attribute to link to a specific page.
  //  - path – a path to append to the URL. Only supported for raw, admin, api, and theme types.
  //  - absolute – set to true to output an absolute URL.
  //  - query – a query string to append to the URL.
  //  - hash – a hash to append to the URL.
  //
  // Examples:
  //
  //  {@url/}
  //  {@url path="/path/to/file.ext"/}
  //  {@url type="author" username="bob" page="2"/}
  //
  dust.helpers.url = (chunk, context, bodies, params) => {
    const locals = context.options.locals;
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(locals.Settings);

    // Resolve all params
    for(let key in params) {
      params[key] = context.resolve(params[key]);
    }

    params.type = context.resolve(params.type) || 'raw';

    if(typeof(MakeUrl[params.type]) === 'function') {
      return chunk.write(MakeUrl[params.type](params));
    }
  };

  //
  // Compares two URLs. Compares against the current URL if `to` is not set.
  //
  // Attributes:
  //
  //  - to - a URL.
  //  - url - a URL to compare against.
  //
  // Examples:
  //
  //  {@urlCompare url="/path/to/compare"/}
  //    ...
  //  {/urlCompare}
  //
  //  {@urlCompare url="/path/to/compare" to="/another/path"}
  //    ...
  //  {/urlCompare}
  //
  //  {@urlCompare url="/path/to/compare"/}
  //    ...
  //  {:else}
  //    ...
  //  {/urlCompare}
  //
  dust.helpers.urlCompare = (chunk, context, bodies, params) => {
    const locals = context.options.locals;
    let to = Url.parse(context.resolve(params.to) || locals.Request.path);
    let url = Url.parse(context.resolve(params.url) || '');
    let match =
      // The URLs must have the same paths
      (to.pathname === url.pathname) &&
      // The URLs must have a matching host or be relative
      (to.host === url.host || !url.host);

    // No match, do else
    if(!match) {
      if(bodies['else']) {
        chunk = chunk.render(bodies['else'], context);
      }
      return chunk;
    }

    chunk = chunk.render(bodies.block, context);

    return chunk;
  };

};
