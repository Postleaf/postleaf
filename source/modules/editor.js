/* eslint-env browser */
'use strict';

// Node modules
const Promise = require('bluebird');

//
// Initializes TinyMCE.
//
//  instance* (object) - An Editor instance.
//
// Returns a promise that resolve with the a TinyMCE instance.
//
function initializeTinymce(instance) {
  return new Promise((resolve, reject) => {

    let settings = {
      browser_spellcheck: true,
      // Document base URL must end with slash per the TinyMCE docs
      document_base_url: instance.baseUrl.replace(/\/$/, '') + '/',
      element_format: 'html',
      entity_encoding: 'raw',
      extended_valid_elements: 'i[class],iframe[*],script[*]',
      formats: {
        // Align left
        alignleft: [
          { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-left' },
          { selector: 'figure', classes: 'align-left', ceFalseOverride: true }
        ],
        // Align center
        aligncenter: [
          { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-center' },
          { selector: 'figure', classes: 'align-center', ceFalseOverride: true }
        ],
        // Align right
        alignright: [
          { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-right' },
          { selector: 'figure', classes: 'align-right', ceFalseOverride: true }
        ],
        // Justify
        alignjustify: [
          { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table', classes: 'align-justify' }
        ],
        // Remove certain formatters so shortcut keys and the API won't apply them.
        h1: {}, h5: {}, h6: {}, div: {}, underline: {},
        // Enable semantic formatters
        strikethrough: { inline: 'del' },
        insert: { inline: 'ins' },
        highlight: { inline: 'mark' }
      },
      hidden_input: false,
      inline: true,
      menubar: false,
      object_resizing: false,
      paste_preprocess: (editor, event) => {
        // Paste as plain text
        if(instance.textOnly) {
          let div = document.createElement('div');
          div.innerHTML = event.content;
          event.content = div.innerText;
        }

        // Run onPaste callback
        instance.onPaste.call(instance, event);
      },
      plugins: 'lists,paste,textpattern,wordcount',
      relative_urls: false,
      skin: false,
      target: instance.element,
      textpattern_patterns: (instance.textOnly || !instance.convertMarkdown) ? [] : [
        {start: '*', end: '*', format: 'italic'},
        {start: '_', end: '_', format: 'italic'},
        {start: '**', end: '**', format: 'bold'},
        {start: '__', end: '__', format: 'bold'},
        {start: '~~', end: '~~', format: 'strikethrough'},
        {start: '`', end: '`', format: 'code'},
        {start: '#', format: 'h1'},
        {start: '##', format: 'h2'},
        {start: '###', format: 'h3'},
        {start: '> ', format: 'blockquote'},
        {start: '* ', cmd: 'InsertUnorderedList'},
        {start: '- ', cmd: 'InsertUnorderedList'},
        {start: '1. ', cmd: 'InsertOrderedList'}
      ],
      toolbar: false,
      setup: function(editor) {
        // PreInit
        editor.on('PreInit', () => {
          // Disable TinyMCE's window manager. We do this because certain plugins such
          // as media/paste/table may trigger a popup in rare cases even though we're
          // not using those features.
          editor.windowManager = {
            alert: function() {},
            close: function() {},
            confirm: function() {},
            getParams: function() {},
            open: function() {},
            setParams: function() {}
          };
        });

        // Handle special elements before content is placed into the editor
        editor.on('BeforeSetContent', (event) => {
          let parser = new DOMParser();
          let doc = parser.parseFromString(event.content, 'text/html');
          let matches;

          // Prepare embed elements when content is set. We store the original embed code
          // to make sure it's unaltered by the DOM or scripts.
          //
          // This:
          //
          //   <div data-embed="true">{html}</div>
          //
          // Will become this:
          //
          //   <div data-embed="{html}" contenteditable="false">{html}</div>
          //
          matches = doc.body.querySelectorAll('[data-embed]');
          for(let i = 0; i < matches.length; i++ ) {
            // Remove data-mce-* from pasted embed blocks
            matches[i].setAttribute('data-embed', removeDataMceAttributes(matches[i].innerHTML));
            matches[i].setAttribute('contenteditable', false);
          }

          // Add contenteditable attributes and caption placeholders
          matches = doc.body.querySelectorAll('figure, figcaption');
          for(let i = 0; i < matches.length; i++) {
            if(matches[i].tagName === 'FIGURE') matches[i].setAttribute('contenteditable', false);
            if(matches[i].tagName === 'FIGCAPTION') {
              matches[i].setAttribute('contenteditable', true);
              if(trim(matches[i].innerText) === '') {
                matches[i].innerHTML = instance.captionPlaceholder;
              }
            }
          }

          // Send back the updated content
          event.content = doc.body.innerHTML;
        });

        // Handle special elements when content is fetched from the editor
        editor.on('GetContent', (event) => {
          let parser = new DOMParser();
          let doc = parser.parseFromString(event.content, 'text/html');
          let matches;

          // This:
          //
          //   <div data-embed="{html}" contenteditable="false">{{html}}</div>
          //
          // Will go back to this:
          //
          //   <div data-embed="true">{html}</div>
          //
          matches = doc.body.querySelectorAll('[data-embed]');
          for(let i = 0; i < matches.length; i++) {
            matches[i].removeAttribute('contenteditable');
            matches[i].innerHTML = matches[i].getAttribute('data-embed');
            matches[i].setAttribute('data-embed', true);
          }

          // Remove contenteditable attributes and caption placeholders
          matches = doc.body.querySelectorAll('figure, figcaption');
          for(let i = 0; i < matches.length; i++) {
            matches[i].removeAttribute('contenteditable');
            if(matches[i].tagName === 'FIGCAPTION') {
              if(trim(matches[i].innerText) === instance.captionPlaceholder) {
                matches[i].innerText = '';
              }
            }
          }

          // Send back the updated content
          event.content = doc.body.innerHTML;
        });

        // Allow new lines?
        if(instance.allowNewlines === false) {
          editor.on('keydown', (event) => {
            if(event.keyCode === 13) event.preventDefault();
          });
        }

        // Simulate a placeholder (highlight on focus, restore on blur)
        if(instance.placeholder) {
          // Remove on focus
          editor.on('focus', () => {
            if(instance.getContent() === trim(instance.placeholder)) {
              instance.selectAll();
            }
          });

          // Restore on blur (when empty)
          editor.on('blur', () => {
            if(!trim(editor.getContent()).length) {
              instance.setContent(instance.placeholder);
            }
          });
        }

        // Convert triple backticks to code blocks
        if(instance.convertMarkdown) {
          editor.on('keydown', (event) => {
            if(event.keyCode === 13) {
              let block = editor.selection.getNode();
              let match = block.innerText.match(/^```([a-z]+)?$/i);

              if(match) {
                event.preventDefault();
                editor.undoManager.transact(() => {
                  block.innerHTML = '';
                  if(match[1]) {
                    block.setAttribute('class', 'language-' + match[1].toLowerCase());
                  }
                  editor.formatter.apply('pre');
                });
              }
            }
          });
        }
      },
      init_instance_callback: (editor) => {
        // Initial placeholder state
        if(instance.placeholder && editor.getContent() === '') {
          editor.setContent(instance.placeholder);
          editor.undoManager.clear();
        }

        // Caption placeholders
        if(instance.captionPlaceholder) {
          // Focus on caption
          instance.document.addEventListener('focus', (event) => {
            if(event.target.tagName === 'FIGCAPTION') {
              if(event.target.innerText === instance.captionPlaceholder) {
                event.target.innerHTML = '<br data-mce-bogus="1"/>';
              }
            }
          }, true);

          // Blur on caption
          instance.document.addEventListener('blur', (event) => {
            if(event.target.tagName === 'FIGCAPTION') {
              if(trim(event.target.innerText) === '') {
                event.target.innerHTML = instance.captionPlaceholder;
              }
            }
          }, true);
        }

        // Event callbacks
        editor.on('NodeChange', () => instance.onSelectionChange.call(instance));
        editor.on('focus', () => instance.onFocus.call(instance));
        editor.on('blur', () => instance.onBlur.call(instance));
        editor.on('change', () => instance.onChange.call(instance));
        editor.on('click', (event) => instance.onClick.call(instance, event));
        editor.on('dblclick', (event) => instance.onDoubleClick.call(instance, event));
        editor.on('keydown', (event) => instance.onKeyDown.call(instance, event), false);
        editor.on('keyup', (event) => instance.onKeyUp.call(instance, event), false);

        resolve(editor);
      }
    };

    // Adjust settings for text-only editors
    if(instance.textOnly) {
      settings.forced_root_block = false;
      settings.formats = {
        // Remove these formatters so shortcut keys and the API won't apply them
        h1: {}, h2: {}, h3: {}, h4: {}, h5: {}, h6: {}, pre: {}, div: {}, p: {}, blockquote: {},
        bold: {}, italic: {}, underline: {}, code: {}, strikethrough: {}, subscript: {}, superscript: {},
        alignleft: {}, alignright: {}, aligncenter: {}, alignjustify: {}
      };
      settings.valid_elements = 'br'; // can't be blank
    }

    // Check for required TinyMCE plugins
    settings.plugins.split(',').forEach((plugin) => {
      if(!instance.tinymce.PluginManager.lookup[plugin]) {
        reject(new Error('Required TinyMCE plugin missing: ' + plugin));
      }
    });

    // Initialize TinyMCE
    instance.tinymce.init(settings);
  });
}

//
// Removes data-mce-* attributes from every element in an HTML string.
//
//  html* (string) - The HTML to parse.
//
// Returns a string.
//
function removeDataMceAttributes(html) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(html, 'text/html');
  let matches = doc.body.querySelectorAll('*');
  let attribs;
  let i;
  let j;

  // Loop through each element
  for(i = 0; i < matches.length; i++) {
    // Get a list of attributes and remove ones that start with data-mce-
    attribs = matches[i].attributes;
    for(j = 0; j < attribs.length; j++) {
      if(attribs[j].name.match(/^data-mce-/)) {
        matches[i].removeAttribute(attribs[j].name);
      }
    }
  }

  return doc.body.innerHTML;
}

//
// Trims whitespace off both ends of a string.
//
//  string* (string) - The string to trim.
//
// Returns a string.
//
function trim(string) {
  return string.replace(/^\s+|\s+$/g, '');
}

//
// Creates a new editor instance.
//
//  options* (object)
//    - element* (element) - The HTML element to make editable.
//    - allowNewlines (boolean) - Whether or not to allow new lines in the editor (default true).
//    - baseUrl (string) - The base URL of the content for generating URLs (default '/').
//    - captionPlaceholder (string) - Placeholder text to use for image captions.
//    - convertMarkdown (boolean) - Whether or not to convert certain markdown syntaxes to HTML
//      (default false).
//    - onBlur (function) - Fired when the editor gets blurs.
//    - onChange (function) - Fired when the editor's content changes.
//    - onClick (function) - Fired when the editor receives a click.
//    - onDoubleClick (function) - Fired when the editor receives a double click.
//    - onFocus (function) - Fired when the editor receives focus.
//    - onKeyDown (function) - Fired when the editor receives a keydown event.
//    - onKeyUp (function) - Fired when the editor receives a keyup event.
//    - onPaste (function) - Fired when content is pasted into the editor.
//    - onSelectionChange (function) - Fired when the editor's selection changes.
//    - placeholder (string) - Placeholder text for the content region.
//    - textOnly (boolean) - Whether or not the editor should only allow plain text.
//
// Returns a new Editor instance.
//
function Editor(options) {
  options = options || {};

  // Check for a valid element
  this.element = options.element;
  if(!this.element.ownerDocument) throw new Error('Parameter `element` must be a valid HTML element.');

  // Identify the element's document and TinyMCE object
  this.document = options.element.ownerDocument;
  this.tinymce = this.document.defaultView.tinymce;
  if(!this.tinymce) throw new Error('TinyMCE is required but not loaded.');

  // Set additional properties
  this.allowNewlines = options.allowNewlines === false ? false : true;
  this.baseUrl = options.baseUrl || '/';
  this.cleanState = null;
  this.captionPlaceholder = options.captionPlaceholder || '';
  this.convertMarkdown = !!options.convertMarkdown;
  this.editor = null;
  this.isReady = false;
  this.onBlur = options.onBlur || function() {};
  this.onChange = options.onChange || function() {};
  this.onClick = options.onClick || function() {};
  this.onDoubleClick = options.onDoubleClick || function() {};
  this.onFocus = options.onFocus || function() {};
  this.onKeyDown = options.onKeyDown || function() {};
  this.onKeyUp = options.onKeyUp || function() {};
  this.onPaste = options.onPaste || function() {};
  this.onSelectionChange = options.onSelectionChange || function() {};
  this.placeholder = options.placeholder || '';
  this.onReady = options.onReady || function() {};
  this.textOnly = !!options.textOnly;

  // Initialize TinyMCE
  initializeTinymce(this)
    .then((editor) => {
      // Store the editor instance
      this.editor = editor;

      // Set initial clean state
      this.cleanState = this.getContent();

      // Fire the ready callback
      this.isReady = true;
      this.onReady();
    })
    .catch(() => {
      throw new Error('Failed to initialize the editor');
    });
}

//
// Toggles center alignment for the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.alignCenter = function() {
  this.editor.execCommand('JustifyCenter');
  return this;
};

//
// Toggles justify alignment for the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.alignJustify = function() {
  this.editor.execCommand('JustifyFull');
  return this;
};

//
// Toggles left alignment for the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.alignLeft = function() {
  this.editor.execCommand('JustifyLeft');
  return this;
};

//
// Toggles right alignment for the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.alignRight = function() {
  this.editor.execCommand('JustifyRight');
  return this;
};

//
// Applies a format to the current selection. Supported formats include:
//
//  blockquote, bold, code, h1, h2, h3, italic, p, pre, strikethrough, subscript, superscript
//
// Returns an Editor instance.
//
Editor.prototype.applyFormat = function(name) {
  this.editor.formatter.apply(name);
  this.editor.nodeChanged();
  return this;
};

//
// Collapses the selection and moves the caret to the start or end of the selected range.
//
//  position* (string) - The desired cursor location 'start' or 'end' (default 'end').
//
// Returns an Editor instance.
//
Editor.prototype.collapseSelection = function(position) {
  this.editor.selection.collapse(position === 'start' ? 'start' : 'end');
  return this;
};

//
// Gets the editor's content.
//
// Returns a string.
//
Editor.prototype.getContent = function() {
  return this.textOnly ? this.editor.getBody().textContent : this.editor.getContent();
};

//
// Gets the location of the current selection. This can be used to restore a selection after DOM or
// other content changes have occurred.
//
// Returns a TinyMCE bookmark object.
//
// NOTE: The output of this method may change in future versions and may not be considered a
// breaking change. It should only be passed directly to setLocation() to restore a selection.
//
Editor.prototype.getLocation = function() {
  return this.editor.selection.getBookmark(2);
};

//
// Gets the selected element. If the cursor is collapsed, the closest parent will be returned. If
// the selection spans multiple elements, the closest parent of those elements will be returned.
//
// Returns an element.
//
Editor.prototype.getSelectedElement = function() {
  return this.editor.selection.getNode();
};

//
// Gets the current word count.
//
// Returns an integer.
//
Editor.prototype.getWordCount = function() {
  return this.editor.plugins.wordcount.getCount();
};

//
// Sets focus on the editor.
//
// Returns an Editor instance.
//
Editor.prototype.focus = function() {
  this.editor.focus();
  return this;
};

//
// Tests the current selection to see if the specified format is applied.
//
// Returns a boolean.
//
Editor.prototype.hasFormat = function(name) {
  return this.editor.formatter.match(name);
};

//
// Detects if the editor has an available undo state.
//
// Returns a boolean.
//
Editor.prototype.hasUndo = function() {
  return this.editor.undoManager.hasUndo();
};

//
// Detects if the editor has an available redo state.
//
// Returns a boolean.
//
Editor.prototype.hasRedo = function() {
  return this.editor.undoManager.hasRedo();
};

//
// Increases the current selection's indentation.
//
// Returns an Editor instance.
//
Editor.prototype.indent = function() {
  this.editor.execCommand('indent');
  return this;
};

//
// Inserts content at the last known caret position.
//
//  content* (string) - The content to insert.
//
// Returns an Editor instance.
//
Editor.prototype.insertContent = function(content) {
  this.editor.execCommand('mceInsertContent', false, content);
  return this;
};

//
// Inserts an embeddable object at the current selection.
//
//  code* (string) - The HTML code of the embed.
//  options (object)
//    - provider (string) - The embed provider's name, which will be stored in data-embed-provider.
//
// Returns an Editor instance.
//
Editor.prototype.insertEmbed = function(code, options) {
  options = options || {};
  let embed = this.editor.dom.getParent(this.editor.selection.getNode(), '[data-embed]');

  this.editor.undoManager.transact(() => {
    if(!embed) {
      // Insert a new embed
      let div = document.createElement('div');
      div.setAttribute('data-embed', code);
      if(options.provider) {
        div.setAttribute('data-embed-provider', options.provider);
      }
      div.setAttribute('contenteditable', false);
      div.innerHTML = code;
      this.editor.insertContent(div.outerHTML);
    } else {
      // Update an existing embed
      embed.setAttribute('data-embed', code);
      if(options.provider) {
        embed.setAttribute('data-embed-provider', options.provider);
      } else {
        embed.removeAttribute('data-embed-provider');
      }
      embed.setAttribute('contenteditable', false);
      embed.innerHTML = code;
    }
  });

  return this;
};

//
// Inserts an image at the current selection.
//
//  src* (string) - The images's src attribute.
//  options (object)
//    - srcset (string) - The image's srcset attribute.
//    - sizes (string) - The image's sizes attribute.
//    - alt (string) - The image's alt attribute.
//    - align (string) - The image's alignment ('left', 'center', 'right', 'none').
//    - caption (boolean) - Whether or not to include a caption for this image.
//
// Returns an Editor instance.
//
Editor.prototype.insertImage = function(src, options) {
  options = options || {};
  let figure = this.editor.dom.getParent(this.editor.selection.getNode(), 'figure');
  let image = figure ? this.editor.dom.select('img', figure) : null;
  let caption = figure ? this.editor.dom.select('figcaption', figure): null;

  this.editor.undoManager.transact(() => {
    if(!figure) {
      // Insert a new image
      figure = this.editor.dom.create('figure', { class: 'image' });
      image = this.editor.dom.create('img', {
        src: src || '',
        srcset: options.srcset || '',
        sizes: options.sizes || '',
        alt: options.alt || ''
      });
      figure.appendChild(image);

      // Create a caption
      if(options.caption) {
        caption = this.editor.dom.create('figcaption', null, this.captionPlaceholder);
        figure.appendChild(caption);
      }

      // Insert it into the editor
      this.editor.insertContent(figure.outerHTML);
    } else {
      // Update an existing image
      this.editor.dom.setAttribs(image, {
        src: src || '',
        srcset: options.srcset || '',
        sizes: options.sizes || '',
        alt: options.alt || ''
      });

      // Update caption
      if(typeof options.caption !== 'undefined') {
        if(!caption.length && options.caption) {
          // Create a new caption
          caption = this.editor.dom.create('figcaption', null, this.captionPlaceholder);
          figure.appendChild(caption);
        } else if(caption.length && !options.caption) {
          // Remove existing caption
          this.editor.dom.remove(caption);
        }
      }
    }

    // Set alignment
    if(typeof options.align !== 'undefined') {
      this.editor.formatter.remove('alignleft');
      this.editor.formatter.remove('aligncenter');
      this.editor.formatter.remove('alignright');
      this.editor.formatter.remove('alignjustify');
      if(options.align === 'left') this.editor.formatter.apply('alignleft');
      if(options.align === 'center') this.editor.formatter.apply('aligncenter');
      if(options.align === 'right') this.editor.formatter.apply('alignright');
    }
  });
};

//
// Applies a link to the current selection.
//
//  href* (string) - The link's href attribute.
//  options (object)
//    - target (string) - The link's target attribute.
//    - title (string) - The link's title attribute.
//
// Returns an Editor instance.
//
Editor.prototype.insertLink = function(href, options) {
  options = options || {};

  this.editor.execCommand('mceInsertLink', false, {
    href: href || '',
    target: options.target || '',
    title: options.title || '',
    rel: options.target ? 'noopener' : ''
  });

  return this;
};

//
// Detects if the current selection is aligned center.
//
// Returns a boolean.
//
Editor.prototype.isAlignCenter = function() {
  return this.editor.formatter.match('aligncenter');
};


//
// Detects if the current selection is aligned center.
//
// Returns a boolean.
//
Editor.prototype.isAlignJustify = function() {
  return this.editor.formatter.match('alignjustify');
};

//
// Detects if the current selection is aligned left.
//
// Returns a boolean.
//
Editor.prototype.isAlignLeft = function() {
  return this.editor.formatter.match('alignleft');
};

//
// Detects if the current selection is aligned right.
//
// Returns a boolean.
//
Editor.prototype.isAlignRight = function() {
  return this.editor.formatter.match('alignright');
};

//
// Detects if the editor has unsaved changes.
//
// Returns a boolean.
//
Editor.prototype.isDirty = function() {
  return this.cleanState !== null && this.cleanState !== this.getContent();
};

//
// Detects if the current selection is an embed.
//
// Returns a boolean.
//
Editor.prototype.isEmbed = function() {
  return !!this.editor.dom.getParent(this.editor.selection.getNode(), '[data-embed]');
};

//
// Detects if the current selection is an image.
//
// Returns a boolean.
//
Editor.prototype.isImage = function() {
  return !!this.editor.dom.getParent(this.editor.selection.getNode(), 'img, figure.image');
};

//
// Detects if the current selection is a link.
//
// Returns a boolean.
//
Editor.prototype.isLink = function() {
  return !!this.editor.dom.getParent(this.editor.selection.getNode(), 'a');
};

//
// Detects if the current selection is an ordered list.
//
// Returns a boolean.
//
Editor.prototype.isOrderedList = function() {
  return !!this.editor.dom.getParent(this.editor.selection.getNode(), 'ol');
};

//
// Detects if the current selection is an unordered list.
//
// Returns a boolean.
//
Editor.prototype.isUnorderedList = function() {
  return !!this.editor.dom.getParent(this.editor.selection.getNode(), 'ul');
};

//
// Resets the editor's dirty state.
//
// Returns an Editor instance.
//
Editor.prototype.makeClean = function() {
  this.cleanState = this.getContent();
  return this;
};

//
// Decreases the current selection's indentation.
//
// Returns an Editor instance.
//
Editor.prototype.outdent = function() {
  this.editor.execCommand('outdent');
  return this;
};

//
// Toggles the editor's state between read-only and read/write.
//
//  readonly* (boolean) - True for read-only, false for read/write.,
//
// Returns an Editor instance.
//
Editor.prototype.readonly = function(readOnly) {
  this.editor.setMode(readOnly === true ? 'readonly' : 'design');
  return this;
};

//
// Reverts to the next undo state.
//
Editor.prototype.redo = function(cmd) {
  if(cmd === 'test') {
    return this.editor.undoManager.hasRedo();
  } else {
    this.editor.execCommand('Redo');
  }
};

//
// Removes an element element.
//
//  element* (element) - The element to remove.
//
// Returns an Editor instance.
//
Editor.prototype.removeElement = function(element) {
  this.editor.dom.remove(element);
  return this;
};

//
// Removes a format from the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.removeFormat = function(name) {
  this.editor.formatter.remove(name);
  this.editor.nodeChanged();
  return this;
};

//
// Removes a link from the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.removeLink = function() {
  this.editor.execCommand('unlink');
  return this;
};

//
// Removes text formatting from the current selection.
//
// Returns an editor object.
//
Editor.prototype.removeTextFormatting = function() {
  this.editor.execCommand('RemoveFormat');
  return this.editor;
};

//
// Removes the selected element.
//
Editor.prototype.removeSelectedElement = function() {
  this.editor.dom.remove(this.getSelectedElement());
  return this;
};

//
// Resets the editor's undo state.
//
// Returns an Editor instance.
//
Editor.prototype.resetUndo = function() {
  this.editor.undoManager.clear();
  return this;
};

//
// Selects all content in the editor.
//
// Returns an Editor instance.
//
Editor.prototype.selectAll = function() {
  this.editor.selection.select(this.editor.getBody(), true);
  return this;
};

//
// Sets the editor's content.
//
//  content* (string) - The content to set.
//
// Returns an Editor instance.
//
Editor.prototype.setContent = function(content) {
  this.editor.setContent(content);
  return this;
};

//
// Restores the selection to the specified location.
//
//  location* (object) - A location object as returned from getLocation().
//
// Returns an Editor instance.
//
Editor.prototype.setLocation = function(location) {
  this.editor.selection.moveToBookmark(location);
  return this;
};

//
// Sets the selection to the specified element.
//
//  element* (element) - The HTML element to select.
//
// Returns an Editor instance.
//
Editor.prototype.setSelectedElement = function(element) {
  this.editor.selection.setNode(element);
  return this;
};

//
// Toggles a format on/off of the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.toggleFormat = function(name) {
  this.editor.formatter.toggle(name);
  this.editor.undoManager.add();
  this.editor.nodeChanged();
  return this;
};

//
// Toggles an ordered list for the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.toggleOrderedList = function() {
  this.editor.execCommand('InsertOrderedList');
  return this;
};

//
// Toggles an unordered list for the current selection.
//
// Returns an Editor instance.
//
Editor.prototype.toggleUnorderedList = function() {
  this.editor.execCommand('InsertUnorderedList');
  return this;
};

//
// Reverts to the previous undo state.
//
// Returns an Editor instance.
//
Editor.prototype.undo = function() {
  this.editor.execCommand('Undo');
  return this;
};

module.exports = Editor;
