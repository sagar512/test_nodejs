
let Address = sequelizeConnection.define('Address', {
    firstName: { type: DataTypes.STRING },
    addressOne: { type: DataTypes.STRING },
    addressTwo: { type: DataTypes.STRING },
    country: { type: DataTypes.STRING },
    state: { type: DataTypes.STRING },
    city: { type: DataTypes.STRING },
    countryCode: { type: DataTypes.STRING},
    mobile: { type: DataTypes.STRING},
    addressType:{ type:   Sequelize.ENUM,
        values: ['Home', 'Work'],
        defaultValue:'Work'},
    primaryAddressStatus:{ type: DataTypes.BOOLEAN, defaultValue: false },
    longitude:{type:DataTypes.STRING},
    latitude:{type:DataTypes.STRING},
    zipcode: { type: DataTypes.STRING },
    addressPoint: {
      type: Sequelize.GEOMETRY('POINT'),
      coordinates: [],
      allowNull: true
  },
}, {
    freezeTableName: true,
    paranoid: true
});

Address.associate = (models) => {
    models.Address.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
    models.Address.belongsTo(models.Kitchen, {
        foreignKey: 'kitchenId',
        onDelete: 'cascade'
    });
};



module.exports = {
    Address
}