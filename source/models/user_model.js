'use strict';

// Node modules
const Bcrypt = require('bcryptjs');
const Crypto = require('crypto');
const Extend = require('extend');
const Jwt = require('jsonwebtoken');
const Lunr = require('lunr');
const Promise = require('bluebird');

//
// Converts a model object to a Lunr search index object.
//
// Returns an object.
//
function getSearchIndexObject(userObject) {
  return {
    id: userObject.id,
    heavy: userObject.name,
    light: [
      userObject.email,
      userObject.username,
      userObject.bio,
      userObject.location
    ].join(' ')
  };
}

module.exports = (sequelize, DataTypes) => {

  const user = sequelize.define('user', {
    // Schema
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          args: true,
          msg: 'this_field_cannot_be_empty' // i18n
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      unique: {
        args: true,
        msg: 'this_email_address_is_already_in_use' // i18n
      },
      allowNull: false,
      validate: {
        notEmpty: {
          args: true,
          msg: 'this_field_cannot_be_empty' // i18n
        },
        isEmail: {
          args: true,
          msg: 'this_is_not_a_valid_email_address' // i18n
        }
      }
    },
    username: {
      type: DataTypes.STRING,
      unique: {
        args: true,
        msg: 'this_username_is_already_in_use' // i18n
      },
      allowNull: false,
      validate: {
        is: {
          args: /^[a-z](?:-?[a-z0-9]+)*$/,
          msg: 'usernames_must_be_lowercase_and_can_only_contain' // i18n
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          args: true,
          msg: 'this_field_cannot_be_empty' // i18n
        }
      }
    },
    resetToken: DataTypes.STRING,
    role: DataTypes.ENUM('owner', 'admin', 'editor', 'contributor'),
    avatar: DataTypes.STRING,
    image: DataTypes.STRING,
    location: DataTypes.STRING,
    bio: DataTypes.TEXT,
    website: DataTypes.STRING
  }, {
    // Class methods
    classMethods: {
      //
      // Builds the full text search index and stores it in user.searchIndex.
      //
      // Returns a promise with the search index as its first argument.
      //
      buildSearchIndex: () => {
        // Create an instance of Lunr
        user.searchIndex = Lunr(function() {
          this.ref('id');
          this.field('heavy', { boost: 10 });
          this.field('light');
        });

        // Build an index of users using searchable fields
        return user
          .findAll({
            attributes: ['id', 'name', 'email', 'username', 'bio', 'location']
          })
          .then((users) => {
            // Index each user
            for(let i in users) {
              user.searchIndex.add(getSearchIndexObject(users[i]));
            }

            return user.searchIndex;
          });
      },

      //
      // Attempts to decode an auth token.
      //
      //  token* (string) - The auth token to decode.
      //
      // Returns a promise resolving with the respective user object.
      //
      decodeAuthToken(token) {
        return new Promise((resolve, reject) => {
          try {
            // Decode it
            let decoded = Jwt.verify(token, process.env.AUTH_SECRET);

            // Fetch the user
            user
              .findOne({
                attributes: { exclude: ['resetToken'] },
                where: {
                  id: decoded.data.id
                }
              })
              .then((user) => {
                if(!user) {
                  return reject(new Error('User not found.'));
                }

                // Verify token hash
                let hash = Crypto
                  .createHash('sha256')
                  .update(process.env.AUTH_SECRET + user.password)
                  .digest('hex')
                  .substring(0, 10);

                if(hash !== decoded.data.hash) {
                  reject(new Error('Invalid auth token.'));
                }

                // Remove password
                user.password = undefined;

                return resolve(user);
              })
              .catch(() => reject(new Error('Error fetching user from the database.')));
          } catch(err) {
            return reject(new Error('Invalid auth token.'));
          }
        });
      },

      //
      // Generates a password hash.
      //
      // Returns a string.
      //
      hashPassword(password) {
        return Bcrypt.hashSync(password, 10);
      },

      //
      // Performs a full text search.
      //
      //  query* (string) - The term(s) to search for.
      //  options (object)
      //    - where (object) - An object to pass to user.findAll to limit results (default null).
      //    - limit (int) - Max number of users to return (default null).
      //    - offset (int) - Return users from this offset (default 0).
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
        let matches = user.searchIndex.search(query);
        let ids = matches.map((val) => val.ref);
        let order = ids.map((val) => {
          return '`user`.`id` = ' + sequelize.escape(val) + ' DESC';
        });
        order = order.join(', ');

        // Return matching users ordered by score
        return user.findAndCountAll({
          where: Extend(true, options.where, { id: { $in: ids } }),
          limit: options.limit,
          offset: options.offset,
          order: sequelize.literal(order)
        });
      }
    },

    // Instance methods
    instanceMethods: {
      //
      // Generates an auth token for the user.
      //
      // Returns an object: { token, expires }
      //
      generateAuthToken: function() {
        let days = process.env.AUTH_LIFETIME;
        let seconds = days * 24 * 60 * 60;
        let expires = new Date(Date.now() + seconds * 1000); // milliseconds

        // Create a hash of the auth secret + password so changing passwords will revoke auth tokens
        let hash = Crypto
          .createHash('sha256')
          .update(process.env.AUTH_SECRET + this.password)
          .digest('hex')
          .substring(0, 10);

        let token = Jwt.sign({
          data: {
            id: this.id,
            hash: hash
          }
        }, process.env.AUTH_SECRET, { expiresIn: seconds });

        return {
          token: token,
          expires: expires
        };
      },

      //
      // Hashes and sets the user's password.
      //
      // Returns the user instance.
      //
      setPassword: function(password) {
        this.password = user.hashPassword(password);
        return this;
      },

      //
      // Verifies the user's password.
      //
      // Returns true if the password matches, false otherwise.
      //
      verifyPassword: function(password) {
        return Bcrypt.compareSync(password, this.password);
      }
    },

    // Hooks
    hooks: {
      //
      // Update the search index when users are added, deleted, and updated
      //
      afterCreate: (item) => user.searchIndex.add(getSearchIndexObject(item)),
      afterDelete: (item) => user.searchIndex.remove({ id: item.id }),
      afterUpdate: (item) => user.searchIndex.update(getSearchIndexObject(item))
    }
  });

  return user;

};
