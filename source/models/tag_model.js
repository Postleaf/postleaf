'use strict';

// Node modules
const Extend = require('extend');
const Lunr = require('lunr');

//
// Converts a model object to a Lunr search index object.
//
// Returns an object.
//
function getSearchIndexObject(tagObject) {
  return {
    id: tagObject.id,
    heavy: tagObject.name,
    light: [
      tagObject.description,
      tagObject.metaTitle,
      tagObject.metaDescription
    ].join(' ')
  };
}

module.exports = (sequelize, DataTypes) => {

  const tag = sequelize.define('tag', {
    // Schema
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        is: {
          args: /^[a-z](?:-?[a-z0-9]+)*$/,
          msg: 'slugs_must_start_with_a_letter_and_can_only_contain' // i18n
        }
      }
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          args: true,
          msg: 'this_field_cannot_be_empty' // i18n
        }
      }
    },
    description: DataTypes.TEXT,
    image: DataTypes.STRING,
    metaTitle: DataTypes.TEXT,
    metaDescription: DataTypes.TEXT
  }, {
    // Class methods
    classMethods: {
      //
      // Builds the full text search index and stores it in tag.searchIndex.
      //
      // Returns a promise with the search index as its first argument.
      //
      buildSearchIndex: () => {
        // Create an instance of Lunr
        tag.searchIndex = Lunr(function() {
          this.ref('id');
          this.field('heavy', { boost: 10 });
          this.field('light');
        });

        // Build an index of tags using searchable fields
        return tag
          .findAll({
            attributes: ['id', 'name', 'description', 'metaTitle', 'metaDescription']
          })
          .then((tags) => {
            // Index each tag
            for(let i in tags) {
              tag.searchIndex.add(getSearchIndexObject(tags[i]));
            }

            return tag.searchIndex;
          });
      },

      //
      // Performs a full text search.
      //
      //  query* (string) - The term(s) to search for.
      //  options (object)
      //    - where (object) - An object to pass to tag.findAll to limit results (default null).
      //    - limit (int) - Max number of tags to return (default null).
      //    - offset (int) - Return tags from this offset (default 0).
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
        let matches = tag.searchIndex.search(query);
        let ids = matches.map((val) => val.ref);
        let order = ids.map((val) => {
          return '`tag`.`id` = ' + sequelize.escape(val) + ' DESC';
        });
        order = order.join(', ');

        // Return matching tags ordered by score
        return tag.findAndCountAll({
          where: Extend(true, options.where, { id: { $in: ids } }),
          limit: options.limit,
          offset: options.offset,
          order: sequelize.literal(order)
        });
      }
    },

    // Instance methods
    instanceMethods: { },

    // Hooks
    hooks: {
      //
      // Update the search index when tags are added, deleted, and updated
      //
      afterCreate: (item) => tag.searchIndex.add(getSearchIndexObject(item)),
      afterDelete: (item) => tag.searchIndex.remove({ id: item.id }),
      afterUpdate: (item) => tag.searchIndex.update(getSearchIndexObject(item))
    }
  });

  return tag;

};
