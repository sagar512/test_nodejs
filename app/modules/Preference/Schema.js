let Preference = sequelizeConnection.define('Preference', {
    name: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    freezeTableName: true,
    paranoid: true
});

module.exports = {
    Preference
}