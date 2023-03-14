let Banner = sequelizeConnection.define('Banner', {
    title: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING },
    colorCode: { type: DataTypes.STRING },
    bgColor: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    bannerCategory: { type: DataTypes.ENUM('food', 'chef', 'orders', 'delivery', 'kitchen', 'marketting', 'legal') },
}, {
    freezeTableName: true,
    paranoid: true
});

module.exports = {
    Banner
}