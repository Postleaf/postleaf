//
// This file bundles up TinyMCE and other scripts required by the editor.
//

/* eslint-env browser, jquery */
'use strict';

global.TinyMCE = require('tinymce/tinymce');

// Default theme is required :-\
require('tinymce/themes/modern/theme');

// Plugins
require('tinymce/plugins/lists');
require('tinymce/plugins/paste');
require('tinymce/plugins/textpattern');
require('tinymce/plugins/wordcount');
