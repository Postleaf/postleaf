/* eslint-env browser, jquery */
'use strict';

// Globals
window.jQuery = window.$ = require('jquery');
window.Tether = require('tether');
window.Postleaf = {
  FileManager: require('../modules/file_manager.js'),
  Slug: require('../modules/slug.js')
};

// Bootstrap
require('bootstrap');

// jQuery plugins
require('@claviska/jquery-ajax-submit/jquery.ajaxSubmit.min.js');
require('@claviska/jquery-alertable/jquery.alertable.min.js');
require('@claviska/jquery-animate-css/jquery.animateCSS.min.js');
require('@claviska/jquery-announce/jquery.announce.min.js');
require('@claviska/jquery-offscreen/jquery.offscreen.js');
require('@claviska/jquery-selectable/jquery.selectable.min.js');
require('typeahead.js/dist/typeahead.jquery.min.js');
require('selectize/dist/js/standalone/selectize.min.js');

// Includes
require('../modules/includes/admin_menu.js');
require('../modules/includes/ajax_submit_defaults.js');
require('../modules/includes/alertable_defaults.js');
require('../modules/includes/dropdown_animations.js');
require('../modules/includes/html_classes.js');
require('../modules/includes/image_control.js');
require('../modules/includes/locater.js');
require('../modules/includes/panel.js');
require('../modules/includes/shortcuts.js');
require('../modules/includes/stretch.js');
require('../modules/includes/toggle_password.js');
require('../modules/includes/xhr_progress.js');
