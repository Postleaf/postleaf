'use strict';

// Node modules
const Path = require('path');

const self = {

  //
  // Gets all admin menu items.
  //
  // Returns an array of menu item groups: [{ items: [] }, { items: [] }, ...]
  //
  get: (I18n, User, Settings) => {
    const MakeUrl = require(Path.join(__basedir, 'source/modules/make_url.js'))(Settings);
    let primary = [];
    let secondary = [];

    // Posts
    primary.push({
      label: I18n.term('posts'),
      link: MakeUrl.admin('posts'),
      icon: 'fa fa-file-text'
    });

    // Tags
    if(['owner', 'admin', 'editor'].includes(User.role)) {
      primary.push({
        label: I18n.term('tags'),
        link: MakeUrl.admin('tags'),
        icon: 'fa fa-tag'
      });
    }

    // Navigation
    if(['owner', 'admin'].includes(User.role)) {
      primary.push({
        label: I18n.term('navigation'),
        link: MakeUrl.admin('navigation'),
        icon: 'fa fa-map'
      });
    }

    // Users
    if(['owner', 'admin'].includes(User.role)) {
      primary.push({
        label: I18n.term('users'),
        link: MakeUrl.admin('users'),
        icon: 'fa fa-user'
      });
    }

    // Settings
    if(['owner', 'admin'].includes(User.role)) {
      primary.push({
        label: I18n.term('settings'),
        link: MakeUrl.admin('settings'),
        icon: 'fa fa-gear'
      });
    }

    // New
    secondary.push({
      label: I18n.term('new_post'),
      link: MakeUrl.admin('posts/new'),
      icon: 'fa fa-plus'
    });

    // Search
    secondary.push({
      label: I18n.term('search'),
      link: '#locater',
      icon: 'fa fa-search',
      noSearch: true
    });

    return [
      { items: secondary },
      { items: primary }
    ];
  }

};

module.exports = self;
