const _ = require('lodash');
const config = require('../../../configs/configs');

let Dish = sequelizeConnection.define('Dish', {
    name: { type: DataTypes.STRING },
    media:{
        type: DataTypes.JSON,
        get() {
            let rawValue = this.getDataValue('media');
            if (rawValue) {
                return _.map(rawValue, a => {
                    a.url = config.azureUrl + a.url;
                    a.thumbnailUrl = config.azureUrl + a.thumbnailUrl;
                    return a;
                })
            } else {
                return null;
            }
        }
    },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT },
    type: { type: DataTypes.STRING },
    preparationTime: { type: DataTypes.STRING },
    // calories: { type: DataTypes.STRING},
    // protein: { type: DataTypes.STRING},
    // fat: { type: DataTypes.STRING},
    // carbohydrate: { type: DataTypes.STRING},
    nutrition:{ type: DataTypes.JSON},
    attribute: { type: DataTypes.JSON},
    totalRating:{ type: DataTypes.INTEGER}, //total count for rating 
    avgRate:{ type: DataTypes.FLOAT},
    topSelling:{ type: DataTypes.INTEGER},
    dishStatus:{
        type:   Sequelize.ENUM,
        values: ['Publish', 'Unpublish'],
      },
      saleType:{
        type:   Sequelize.ENUM,
        values: ['Selling', 'Sold Out'],
      }, 
      isPreOrderOnly:{type:DataTypes.BOOLEAN,defaultValue:false}
}, {
    freezeTableName: true,
    paranoid: true
});

Dish.associate = (models) => {
    models.Dish.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        onDelete: 'cascade'
    });
    models.Dish.belongsTo(models.Cuisine, {
        foreignKey: 'cuisineId',
        onDelete: 'cascade'
    });
    
    models.Dish.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
    models.Dish.belongsTo(models.Preference, {
        foreignKey: 'preferenceId',
        onDelete: 'cascade'
    });
};

let Attribute = sequelizeConnection.define('Attribute', {
    name: { type: DataTypes.STRING },
    displayName: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    price: { type: DataTypes.STRING },
}, {
    freezeTableName: true,
    paranoid: true
});
Attribute.associate = (models) => {
    models.Attribute.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};
let RatingDish = sequelizeConnection.define('RatingDish', {
	rating: { type: DataTypes.FLOAT, defaultValue: 0 },
    comment: { type: DataTypes.STRING }
   
}, {
    freezeTableName: true,
    paranoid: true,
    hooks: {
        afterCreate: async (instance, options) => {
            let dataTotal = await RatingDish.findOne({
                attributes: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'total'], [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg']],
                where: { dishId: instance.dishId },
                raw: true
            });
            dataTotal.avg = Math.round(dataTotal.avg * 100) / 100;
            await Dish.update({ totalRating: dataTotal.total, avgRate: dataTotal.avg }, { where: { id: instance.dishId }});
        },
        afterDestroy: async (instance, options) => {
            let dataTotal = await RatingDish.findOne({
                attributes: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'total'], [Sequelize.fn('AVG', Sequelize.col('rating')), 'avg']],
                where: { dishId: instance.dishId },
                raw: true
            });
            dataTotal.avg = Math.round(dataTotal.avg * 100) / 100;
            await Dish.update({ totalRating: dataTotal.total, avgRate: dataTotal.avg }, { where: { id: instance.dishId }});
        }
    }
});
RatingDish.associate = (models) => {
    models.RatingDish.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
	});
	models.RatingDish.belongsTo(models.Dish, {
        foreignKey: 'dishId',
        onDelete: 'cascade'
    });
};


module.exports = {
    Dish,
    Attribute,
    RatingDish
}