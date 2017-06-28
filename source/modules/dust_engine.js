//
// A Dust.js rendering engine for Express 4.x
//
//  - Supports multiple view folders
//  - Caches views based on full paths instead of names (enables dynamic view switching)
//  - Requires dustjs-linkedin and optionally dustjs-helpers
//  - Built with <3 for Postleaf
//
// Usage:
//
//   app.engine('dust', DustEngine.engine(app, {
//     cache: true,
//     helpers: [
//       require('dustjs-helpers'),
//       require('/path/to/your/helpers.js')
//     ]
//   }));
//   app.set('views', ['/first/view/folder', '/second/view/folder']);
//   app.set('view engine', 'dust');
//
// Helpers:
//
//  Custom helpers can be loaded from modules. Attach your helpers to the dust object like this:
//
//    module.exports = (dust) => {
//      dust.helpers.firstHelper = (chunk, context, bodies, params) => { ... };
//      dust.helpers.secondHelper = (chunk, context, bodies, params) => { ... };
//      ...
//    };
//
// Notes:
//
//  This module disables view caching in Express so it can be handled internally. Do not use this
//  rendering engine alongside other engines in the same Express app if they rely on view caching
//  for performance!
//
'use strict';

// Node modules
const Dust = require('dustjs-linkedin');
const Fs = require('fs');
const Path = require('path');

const templateCache = {};
let useCache = true;

// Compile a template and store it in cache
function compileTemplate(file, callback) {
  // Load the template
  Fs.readFile(file, 'utf8', (err, data) => {
    if(err) return callback(err);

    try {
      // Compile it
      let compiled = Dust.compile(data);

      // Cache it
      if(useCache) {
        templateCache[file] = compiled;
      }

      callback(null, Dust.loadSource(compiled));
    } catch(err) {
      // Show a friendlier error for rendering issues
      let relativePath = Path.relative(__basedir, file);
      return callback(
        new Error('Template Error: ' + err.message + ' in ' + relativePath)
      );
    }
  });
}

// Look for the specified file in all possible directories
function locateFile(file, folders, callback) {
  if(!Array.isArray(folders)) {
    folders = [folders];
  }

  // Try the first folder
  let candidate = Path.resolve(folders[0] || '', file);
  Fs.stat(candidate, (err) => {
    if(err) {
      if(folders.length > 0) {
        // Not found, try the next folder
        return locateFile(file, folders.slice(1), callback);
      } else {
        // No more folders to try, return an error
        return callback(new Error('Unable to locate template: ' + file));
      }
    }

    // Found, return the successful candidate
    return callback(null, candidate);
  });
}

// Disable Dust.js caching so we can handle it ourselves
Dust.config.cache = false;

// Enable whitespace for more readable outputs
Dust.config.whitespace = true;

// Locate the requested template
Dust.onLoad = (name, options, callback) => {
  let file;

  // Absolute path
  if(Path.isAbsolute(name)) {
    file = name;

    // Try cache first
    if(templateCache[file]) {
      try {
        return callback(null, Dust.loadSource(templateCache[file]));
      } catch(err) {
        return callback(err);
      }
    }

    // Load and compile template
    compileTemplate(file, callback);
  } else {
    // Determine filename with extension
    file = Path.extname(name) ? name : name + options.extension;

    // Look for a matching template in all view folders
    locateFile(file, options.viewFolders, (err, file) => {
      if(err) return callback(err);

      // Try cache first
      if(templateCache[file]) {
        try {
          return callback(null, Dust.loadSource(templateCache[file]));
        } catch(err) {
          return callback(err);
        }
      }

      // Load and compile template
      compileTemplate(file, callback);
    });
  }
};

const self = {

  // Express view engine
  engine: (app, config) => {
    // Disable Express view caching so we can handle it internally
    app.disable('view cache');

    // Set cache preference
    if(typeof config.cache !== 'undefined') {
      useCache = config.cache;
    }

    // Load dust helper modules
    if(Array.isArray(config.helpers)) {
      config.helpers.forEach((module) => {
        if(typeof module === 'function') {
          module(Dust);
        }
      });
    }

    // Return a view engine function
    return function(file, options, callback) {
      if(!file) {
        return callback(new Error('No template specified.'));
      }

      // Create the base context
      let baseContext = Dust.makeBase(
        // Context globals
        {
          Template: {
            // Always the filename without extension
            name: Path.basename(this.name, '.dust')
          }
        },
        // Context options
        {
          viewFolders: this.root,
          template: this.name,
          extension: this.ext || Path.extname(file),
          locals: options
        }
      ).push(options);

      // Render the requested template (calls Dust.onLoad internally to locate it)
      return Dust.render(file, baseContext, (err, output) => {
        if(err) return callback(err);
        return callback(null, output);
      });
    };
  }

};

module.exports = self;
