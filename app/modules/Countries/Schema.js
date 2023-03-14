let Countries = sequelizeConnection.define('Countries', {
    countryName: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    taxPercentage: { type: DataTypes.FLOAT }
}, {
    freezeTableName: true,
    paranoid: true
});

module.exports = {
    Countries
}