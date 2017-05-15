/* eslint-env es6, node */
'use strict';

const Gulp = require('gulp-help')(require('gulp'));
const Autoprefixer = require('gulp-autoprefixer');
const Babel = require('gulp-babel');
const Browserify = require('gulp-browserify');
const Chalk = require('chalk');
const CleanCSS = require('gulp-clean-css');
const Del = require('del');
const ESLint = require('gulp-eslint');
const Imagemin = require('gulp-imagemin');
const Path = require('path');
const Rename = require('gulp-rename');
const Sass = require('gulp-sass');
const Uglify = require('gulp-uglify');
const Watch = require('gulp-watch');

////////////////////////////////////////////////////////////////////////////////////////////////////
// Config
////////////////////////////////////////////////////////////////////////////////////////////////////

let fonts = {
  base: Path.join(__dirname, 'node_modules/font-awesome/fonts'),
  source: Path.join(__dirname, 'node_modules/font-awesome/fonts/**/*.+(eot|svg|ttf|woff|woff2|otf)'),
  target: Path.join(__dirname, 'assets/fonts')
};

let images = {
  source: Path.join(__dirname, 'source/images/**/*.+(gif|jpg|jpeg|png|svg)'),
  target: Path.join(__dirname, 'assets/images')
};

let scripts = {
  source: Path.join(__dirname, 'source/scripts/**/*.js'),
  target: Path.join(__dirname, 'assets/js')
};

let styles = {
  source: Path.join(__dirname, 'source/styles/**/*.scss'),
  target: Path.join(__dirname, 'assets/css')
};

////////////////////////////////////////////////////////////////////////////////////////////////////
// Build functions
////////////////////////////////////////////////////////////////////////////////////////////////////

// Copies font files to target
function buildFonts(source, target, base) {
  console.log(Chalk.yellow('Building fonts...'));
  return Gulp.src(source, { base: base })
    .pipe(Gulp.dest(target))
    .on('end', () => {
      console.log(Chalk.green('✔︎ Fonts at ' + new Date()));
    });
}

// Optimizes images in source and outputs them in target
function buildImages(source, target) {
  console.log(Chalk.yellow('Building images...'));
  return Gulp.src(source)
    .pipe(Imagemin())
    .pipe(Gulp.dest(target))
    .on('end', () => {
      console.log(Chalk.green('✔︎ Images at ' + new Date()));
    });
}

// Minifies scripts in source and outputs them in target
function buildScripts(source, target) {
  console.log(Chalk.yellow('Building scripts...'));
  return Gulp.src(source)
    .pipe(ESLint())
    .pipe(ESLint.format())
    .pipe(ESLint.failAfterError())
    .on('error', (err) => {
      console.error(Chalk.red(err.message));
    })
    .pipe(Browserify())
    .on('error', (err) => {
      console.error(Chalk.red(err.message));
    })
    .pipe(Babel({
      compact: false,
      presets: ['es2015']
    }))
    .on('error', (err) => {
      console.error(Chalk.red(err.message));
    })
    .on('error', (err) => {
      console.error(Chalk.red(err.message));
    })
    .pipe(Uglify({
      preserveComments: 'license'
    }))
    .on('error', (err) => {
      console.error(Chalk.red(err.message));
    })
    .pipe(Rename({ suffix: '.bundle' }))
    .pipe(Gulp.dest(target))
    .on('end', () => {
      console.log(Chalk.green('✔︎ Scripts at ' + new Date()));
    });
}

// Compiles styles in source and outputs them in target
function buildStyles(source, target) {
  console.log(Chalk.yellow('Building styles...'));
  return Gulp.src(source)
    .pipe(Sass({
      includePaths: [
        'node_modules'
      ],
      precision: 8,
      outputStyle: 'compressed'
    }))
    .on('error', (err) => {
      console.error(Chalk.red(err.message));
    })
    .pipe(Autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(CleanCSS({
      format: 'keep-breaks',
      specialComments: 'all'
    }))
    .pipe(Gulp.dest(target))
    .on('end', () => {
      console.log(Chalk.green('✔︎ Styles at ' + new Date()));
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Build tasks
////////////////////////////////////////////////////////////////////////////////////////////////////

// Build fonts
Gulp.task('build:fonts', 'Build font assets.', ['clean:fonts'], () => {
  buildFonts(fonts.source, fonts.target, fonts.base);
});

// Build images
Gulp.task('build:images', 'Optimize images.', ['clean:images'], () => {
  buildImages(images.source, images.target);
});

// Build scripts
Gulp.task('build:scripts', 'Build scripts.', ['clean:scripts'], () => {
  buildScripts(scripts.source, scripts.target);
});

// Build styles
Gulp.task('build:styles', 'Build styles.', ['clean:styles'], () => {
  buildStyles(styles.source, styles.target);
});

// Build all
Gulp.task('build', 'Run all build tasks.', [
  'build:fonts',
  'build:images',
  'build:scripts',
  'build:styles'
]);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Clean tasks
////////////////////////////////////////////////////////////////////////////////////////////////////

// Clean fonts
Gulp.task('clean:fonts', 'Delete generated fonts.', () => {
  return Del(fonts.target);
});

// Clean images
Gulp.task('clean:images', 'Delete generated images.', () => {
  return Del(images.target);
});

// Clean scripts
Gulp.task('clean:scripts', 'Delete generated scripts.', () => {
  return Del(scripts.target);
});

// Clean styles
Gulp.task('clean:styles', 'Delete generated styles.', () => {
  return Del(styles.target);
});

// Clean all
Gulp.task('clean', 'Delete all generated files.', [
  'clean:fonts',
  'clean:images',
  'clean:scripts',
  'clean:styles'
]);

////////////////////////////////////////////////////////////////////////////////////////////////////
// Other tasks
////////////////////////////////////////////////////////////////////////////////////////////////////

// Watch for changes
Gulp.task('watch', 'Watch files and automatically build assets on change.', () => {
  // Watch fonts
  Gulp.src(fonts.source)
    .pipe(Watch(fonts.source))
    .on('add', (file) => {
      buildFonts(file, fonts.target);
    })
    .on('change', (file) => {
      buildFonts(file, fonts.target);
    });

  // Watch images
  Gulp.src(images.source)
    .pipe(Watch(images.source))
    .on('add', (file) => {
      buildImages(file, images.target);
    })
    .on('change', (file) => {
      buildImages(file, images.target);
    });

  // Watch scripts
  Gulp.src(scripts.source)
    .pipe(Watch(scripts.source))
    .on('add', (file) => {
      buildScripts(file, scripts.target);
    })
    .on('change', (file) => {
      buildScripts(file, scripts.target);
    });

  // Watch styles
  Gulp.src(styles.source)
    .pipe(Watch(styles.source))
    // Recompile all styles since changes to _partials.scss won't compile on their own
    .on('add', () => {
      buildStyles(styles.source, styles.target);
    })
    .on('change', () => {
      buildStyles(styles.source, styles.target);
    });
});

// Default
Gulp.task('default', 'Run the default task.', ['help']);
