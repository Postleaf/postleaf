'use strict';

module.exports = (sequelize, DataTypes) => {

  const revision = sequelize.define('revision', {
    // Schema
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: sequelize.models.post,
        key: 'id'
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
    title: DataTypes.TEXT,
    content: DataTypes.TEXT
  }, {

    // Class methods
    classMethods: { },

    // Instance methods
    instanceMethods: { }

  });

  return revision;

};
