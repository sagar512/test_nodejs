let Category = sequelizeConnection.define('Category', {
    name: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    freezeTableName: true,
    paranoid: true
});

module.exports = {
    Category
}