const config = require('../../../configs/configs');

let Cuisine = sequelizeConnection.define('Cuisine', {
    name: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    image: {
        type: DataTypes.STRING,
        get() {
            let rawValue = this.getDataValue('image');
            return rawValue ? config.azureUrl+rawValue : null;
        }
    }

}, {
    freezeTableName: true,
    paranoid: true
});

Cuisine.associate = (models) => {
    models.Cuisine.belongsToMany(models.Users, {
        through: 'ChefCuisine'
    });
};

module.exports = {
    Cuisine
}