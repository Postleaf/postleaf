'use strict';

module.exports = (sequelize, DataTypes) => {

  const setting = sequelize.define('setting', {
    key: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        is: {
          args: /^[a-zA-Z_-]+$/,
          msg: 'Invalid key!'
        }
      }
    },
    value: DataTypes.TEXT
  }, {

    // Class methods
    classMethods: {

      //
      // Loads all settings data into a key/value object.
      //
      // Returns a promise that resolves with an object.
      //
      getObject: function() {
        return sequelize.models.setting
          .findAll()
          .then((settings) => {
            let result = {};

            settings.map((setting) => result[setting.key] = setting.value);

            return result;
          });
      }

    },

    // Instance methods
    instanceMethods: { },

    // Hooks
    hooks: { }

  });

  return setting;

};
