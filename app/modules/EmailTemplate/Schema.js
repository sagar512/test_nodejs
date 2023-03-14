let EmailTemplate = sequelizeConnection.define('EmailTemplate', {
    templateKey: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    subject: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    freezeTableName: true,
    paranoid: true
});

module.exports = {
    EmailTemplate
}