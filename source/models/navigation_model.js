'use strict';

module.exports = (sequelize, DataTypes) => {

  const navigation = sequelize.define('navigation', {
    label: {
      type: DataTypes.STRING,
      allowNull: false
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    primaryKey: false,
    tableName: 'navigation',

    // Class methods
    classMethods: {

      //
      // Loads all navigation data into an array.
      //
      // Returns a promise that resolves with an array of navigation objects.
      //
      getArray: function() {
        return sequelize.models.navigation
          .findAll()
          .then((navigation) => {
            let result = [];
            navigation.forEach((item) => result.push(item.get({ plain: true })));
            return result;
          });
      }

    },

    // Instance methods
    instanceMethods: { },

    // Hooks
    hooks: { }
  });

  return navigation;

};
