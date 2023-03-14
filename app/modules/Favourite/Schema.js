let Favourites = sequelizeConnection.define('Favourites', {
   
}, {
    freezeTableName: true,
    paranoid: true
});

Favourites.associate = (models) => {
    models.Favourites.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
    models.Favourites.belongsTo(models.Users, {
        foreignKey: 'chefId',
        as:'chef',
        onDelete: 'cascade'
    });
    models.Favourites.belongsTo(models.Dish, {
        foreignKey: 'dishId',
        onDelete: 'cascade'
    });
};


module.exports = {
    Favourites
}