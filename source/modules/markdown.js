'use strict';

// Node modules
const He = require('he');
const Marked = require('marked');
const Striptags = require('striptags');
const Trim = require('trim');

// Create a custom renderer
let renderer = new Marked.Renderer();

// Convert code blocks to <pre data-code="js"> instead of <pre><code class="lang-js">
renderer.code = (code, lang) => {
  let pre;

  pre = lang ? '<pre class="language-' + He.encode(lang, { useNamedReferences: true }) + '">' : '<pre>';
  pre += He.encode(code, { useNamedReferences: true });
  pre += '</pre>';

  return pre;
};

const self = {

  //
  // Converts a markdown string to HTML.
  //
  //  text* (string) - The markdown string to convert.
  //
  // Returns an HTML string.
  //
  toHtml: (text) => {
    text = typeof text === 'string' ? text : '';

    return Marked(text, {
      renderer: renderer
    });
  },

  //
  // Converts a markdown string to plain text.
  //
  //  text* (string) - The markdown string to convert.
  //
  toText: (text) => {
    text = typeof text === 'string' ? text : '';

    return Trim(Striptags(He.decode(Marked(text, {
      sanitize: true
    }))));
  }

};

module.exports = self;
