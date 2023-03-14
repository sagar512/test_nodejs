const Config = require("../../../configs/configs");
const _ = require('lodash');

let Kitchen = sequelizeConnection.define('Kitchen', {
    name: { type: DataTypes.STRING },
    addressOne: { type: DataTypes.STRING },
    addressTwo: { type: DataTypes.STRING },
    city: { type: DataTypes.STRING },
    state: { type: DataTypes.STRING },
    country: { type: DataTypes.STRING },
    zipcode: { type: DataTypes.STRING },
    longitude: { type: DataTypes.STRING },
    latitude: { type: DataTypes.STRING },
    addressPoint: {
        type: Sequelize.GEOMETRY('POINT'),
        coordinates: [],
        allowNull: false
    },
    kitchenStatus: {
        type: Sequelize.ENUM,
        values: ['Publish', 'Unpublish'],
        defaultValue: 'Unpublish'
    },
    adminStatus: {
        type: Sequelize.ENUM,
        values: ['Pending', 'Approved', 'Rejected'],
        defaultValue: 'Pending'
    },
    adminStatusReason: { type: DataTypes.TEXT },

    images: {
        type: DataTypes.JSON,
        get() {
            let rawValue = this.getDataValue('images');
            if (rawValue) {
                return _.map(rawValue, a => {
                    a.url = Config.azureUrl + a.url;
                    a.thumbnailUrl = Config.azureUrl + a.thumbnailUrl;
                    return a;
                })
            } else {
                return null;
            }
        }
    },
    kitchenStartTime: { type: DataTypes.STRING },
    kitchenEndTime: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT },

    feature: { type: DataTypes.JSON },
    // additionalService: { type: DataTypes.JSON },
    // equipment: { type: DataTypes.JSON },
    otherService: { type: DataTypes.STRING },
    userType: { type: DataTypes.STRING }
}, {
    freezeTableName: true,
    paranoid: true
});

Kitchen.associate = (models) => {
    models.Kitchen.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};

module.exports = {
    Kitchen
}