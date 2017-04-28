'use strict';

// Node modules
const Slugify = require('slugify');

//
// Generates a slug.
//
//  string* (string) - The string to convert.
//
// Returns a string;
//
module.exports = (string) => {
  if(typeof string !== 'string') return '';

  // Convert Unicode characters to Latin equivalents
  return Slugify(string)
    .toLowerCase()
    // Convert spaces and underscores to dashes
    .replace(/(\s|_)/g, '-')
    // Remove unsafe characters
    .replace(/[^a-z0-9-]/g, '')
    // Remove duplicate dashes
    .replace(/-+/g, '-')
    // Remove starting and ending dashes
    .replace(/(^-|-$)/g, '');
};
