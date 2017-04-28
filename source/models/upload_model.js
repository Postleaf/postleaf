'use strict';

// Node modules
const Extend = require('extend');

module.exports = (sequelize, DataTypes) => {

  const upload = sequelize.define('upload', {
    // Schema
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: sequelize.models.user,
        key: 'id'
      }
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    extension: {
      type: DataTypes.STRING,
      allowNull: false
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER
    },
    height: {
      type: DataTypes.INTEGER
    }
  }, {
    // Class methods
    classMethods: {
      //
      // Performs a search.
      //
      //  query* (string) - The term(s) to search for.
      //  options (object)
      //    - where (object) - An object to pass to post.findAll to limit results (default null).
      //    - limit (int) - Max number of posts to return (default null).
      //    - offset (int) - Return posts from this offset (default 0).
      //
      // Returns a promise.
      //
      search: (query, options) => {
        options = Extend(true, {
          where: null,
          limit: null,
          offset: 0
        }, options);

        // Perform the search
        return upload.findAndCountAll({
          where: Extend(true, options.where, {
            filename: { $like: '%' + query.replace(/(%)/g, '\\$1') + '%' }
          }),
          limit: options.limit,
          offset: options.offset,
          order: [
            ['createdAt', 'DESC']
          ]
        });
      }
    },

    // Instance methods
    instanceMethods: { },

    // Hooks
    hooks: { }
  });

  return upload;

};
