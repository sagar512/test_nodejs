let Report = sequelizeConnection.define('Report', {
    reportName: { type: DataTypes.STRING },
    reason: { type: DataTypes.STRING },
    reportBy: { type: DataTypes.STRING },
    reportType: {
        type:   Sequelize.ENUM,
        values: ['Dish', 'Chef','NewsFeed','Comment'],
      },
    message: { type: DataTypes.STRING },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    freezeTableName: true,
    paranoid: true
});

Report.associate = (models) => {
   
    models.Report.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
    models.Report.belongsTo(models.Users, {
        foreignKey: 'chefId',
        onDelete: 'cascade'
    });
    models.Report.belongsTo(models.Dish, {
        foreignKey: 'dishId',
        onDelete: 'cascade'
    });
    models.Report.belongsTo(models.NewsFeed, {
        foreignKey: 'newsFeedId',
        onDelete: 'cascade'
    });
    models.Report.belongsTo(models.NewsFeedComment, {
        foreignKey: 'commentId',
        onDelete: 'cascade'
    });
};
module.exports = {
    Report
}