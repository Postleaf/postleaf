'use strict';

// Node modules
const Extend = require('extend');
const Moment = require('moment');
const Lunr = require('lunr');
const Striptags = require('striptags');

//
// Converts a model object to a Lunr search index object.
//
// Returns an object.
//
function getSearchIndexObject(postObject) {
  return {
    id: postObject.id,
    heavy: postObject.title,
    light: [
      Striptags(postObject.content),
      postObject.metaTitle,
      postObject.metaDescription
    ].join(' ')
  };
}

module.exports = (sequelize, DataTypes) => {

  const post = sequelize.define('post', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: sequelize.models.user,
        key: 'id'
      }
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: {
          args: true,
          msg: 'this_field_is_invalid' // i18n
        }
      }
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          args: true,
          msg: 'this_field_cannot_be_empty' // i18n
        }
      }
    },
    content: DataTypes.TEXT,
    image: DataTypes.TEXT,
    metaTitle: DataTypes.TEXT,
    metaDescription: DataTypes.TEXT,
    template: DataTypes.STRING,
    status: DataTypes.ENUM('draft', 'pending', 'rejected', 'published'),
    isPage: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    isSticky: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    // Class methods
    classMethods: {
      //
      // Builds the full text search index and stores it in post.searchIndex.
      //
      // Returns a promise with the search index as its first argument.
      //
      buildSearchIndex: () => {
        // Create an instance of Lunr
        post.searchIndex = Lunr(function() {
          this.ref('id');
          this.field('heavy', { boost: 10 });
          this.field('light');
        });

        // Build an index of posts using searchable fields
        return post
          .findAll({
            attributes: ['id', 'title', 'content', 'metaTitle', 'metaDescription']
          })
          .then((posts) => {
            // Index each post
            for(let i in posts) {
              post.searchIndex.add(getSearchIndexObject(posts[i]));
            }

            return post.searchIndex;
          });
      },

      //
      // Returns the number of posts based on the specified options.
      //
      //  author (string) - A username.
      //  tag (string) - A tag slug.
      //
      // Returns a promise that resolve with an integer post count.
      //
      getCount: (options) => {
        let author = options.author;
        let tag = options.tag;
        let status = options.status;
        let isFeatured = options.isFeatured;
        let isPage = options.isPage;
        let isSticky = options.isSticky;
        let isPublic = options.isPublic;
        let include = [];
        let where = {};

        // Count by author
        if(author) {
          include.push({
            model: sequelize.models.user,
            as: 'author',
            attributes: { exclude: ['password', 'resetToken'] },
            where: { username: author }
          });
        }

        // Count by tag
        if(tag) {
          include.push({
            model: sequelize.models.tag,
            where: { slug: tag }
          });
        }

        // Filter by status
        if(typeof status !== 'undefined') where.status = status;

        // Filter by flags
        if(typeof isFeatured !== 'undefined') where.isFeatured = isFeatured ? 1 : 0;
        if(typeof isPage !== 'undefined') where.isPage = isPage ? 1 : 0;
        if(typeof isSticky !== 'undefined') where.isSticky = isSticky ? 1 : 0;

        // Filter by public posts
        if(typeof isPublic !== 'undefined') {
          if(isPublic === 'true') {
            where.status = 'published';
            where.publishedAt = { $lt: Moment().utc().toDate() };
          } else {
            where.status !== 'published';
          }
        }

        // Get the count
        return post.count({
          where: where,
          include: include
        });
      },

      //
      // Performs a full text search.
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
        let matches = post.searchIndex.search(query);
        let ids = matches.map((val) => val.ref);
        let order = ids.map((val) => {
          return '`post`.`id` = ' + sequelize.escape(val) + ' DESC';
        });
        order = order.join(', ');

        // Return matching posts ordered by score
        return post.findAndCountAll({
          distinct: true,
          where: Extend(true, options.where, { id: { $in: ids } }),
          include: [
            {
              model: sequelize.models.user,
              as: 'author',
              attributes: { exclude: ['password', 'resetToken'] }
            },
            {
              model: sequelize.models.tag,
              through: { attributes: []  }, // exclude postTags
              where: null // also return posts that don't have tags
            }
          ],
          limit: options.limit,
          offset: options.offset,
          order: [
            sequelize.literal(order),
            sequelize.fn('lower', sequelize.col('tags.name'))
          ]
        });
      }
    },

    // Instance methods
    instanceMethods: {
      //
      // Returns the next public post.
      //
      //  options (object)
      //    - previous (boolean) - Set to true to return the previous post.
      //
      // Returns a promise with a post as its first argument.
      //
      getNext: function(options) {
        options = options || {};
        let previous = options.previous;
        let order = previous ? 'DESC' : 'ASC';

        return post.findOne({
          where: {
            id: { $ne: this.id },
            status: 'published',
            isPage: 0,
            publishedAt: Extend(
              // Post must not be in the future
              { $lt: Moment().utc().toDate() },
              // Previous post must be <= the target post's publish date. Next post must be > the
              // target post's published date. We use > instead of >= for next postp to avoid
              // duplicates when two posts have the same exact publish date.
              previous ? { $lte: this.publishedAt } : { $gt: this.publishedAt }
            )
          },
          include: [
            {
              model: sequelize.models.user,
              as: 'author',
              attributes: { exclude: ['password', 'resetToken'] }
            },
            {
              model: sequelize.models.tag,
              through: { attributes: [] }, // exclude postTags
              where: null // also return posts that don't have tags
            }
          ],
          order: [
            ['publishedAt', order]
          ]
        });
      },

      //
      // Gets suggested posts based on the current post.
      //
      // Returns a promise with the suggested posts as the first argument.
      //
      getRelated: function(options) {
        options = options || {};
        let count = options.count || 10;
        let offset = options.offset || 0;
        let tags = this.tags || [];

        // Get ids of posts that share the same tags as this post
        return sequelize.models.tag.findAll({
          where: {
            id: { $in: tags.map((tag) => tag.id) }
          },
          include: [{
            model: post,
            where: {
              status: 'published',
              isPage: 0,
              publishedAt: { $lt: Moment().utc().toDate() }
            }
          }]
        })
        .then((result) => {
          // Assemble post ids in an array
          let ids = [];
          result.forEach((tag) => {
            tag.posts.forEach((post) => {
              ids.push(post.id);
            });
          });

          // Fetch matching posts and associations
          return post.findAll({
            where: {
              id: {
                $not: this.id,
                $in: ids
              }
            },
            include: [
              {
                model: sequelize.models.user,
                as: 'author',
                attributes: { exclude: ['password', 'resetToken'] }
              },
              {
                model: sequelize.models.tag,
                through: { attributes: [] }, // exclude postTags
                where: null // also return posts that don't have tags
              }
            ],
            order: [
              ['publishedAt', 'DESC']
            ],
            limit: count,
            offset: offset
          });
        });
      },

      //
      // Determines whether or not a post is publicly visible.
      //
      // Returns a boolean.
      //
      isPublic: function() {
        if(this.status !== 'published') return false;

        // Make sure the publish date isn't in the future
        let now = new Moment.utc();
        let publishedAt = new Moment(this.publishedAt);
        if(publishedAt.isAfter(now)) return false;

        return true;
      }
    },

    // Hooks
    hooks: {
      //
      // Update the search index when posts are added, deleted, and updated
      //
      afterCreate: (item) => post.searchIndex.add(getSearchIndexObject(item)),
      afterDelete: (item) => post.searchIndex.remove({ id: item.id }),
      afterUpdate: (item) => post.searchIndex.update(getSearchIndexObject(item))
    }
  });

  return post;

};
