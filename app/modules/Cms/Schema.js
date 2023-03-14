let CmsPage = sequelizeConnection.define('CmsPage', {
    templateKey: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT }
}, {
    freezeTableName: true,
    paranoid: true
});
let FaqCategory = sequelizeConnection.define('FaqCategory', {
    name: { type: DataTypes.STRING }
}, {
    freezeTableName: true,
    paranoid: true
});
let FAQ = sequelizeConnection.define('FAQ', {
    question: { type: DataTypes.STRING(1000) },
    answer: { type: DataTypes.TEXT },
    status: { type: DataTypes.BOOLEAN, defaultValue: false },
    displayOrder: { type: DataTypes.INTEGER, defaultValue: 1 }
}, {
    freezeTableName: true,
    paranoid: true
});
FAQ.associate = (models) => {
    models.FAQ.belongsTo(models.FaqCategory, {
        foreignKey: 'categoryId'
    });
};
let ContactUs = sequelizeConnection.define('ContactUs', {
    type: { type: DataTypes.STRING(1000) },
    userRole: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    ticketId: { type: DataTypes.STRING }
}, {
    freezeTableName: true,
    paranoid: true
});

ContactUs.associate = (models) => {
    models.ContactUs.belongsTo(models.Order, {
        foreignKey: 'orderId'
    });
    models.ContactUs.belongsTo(models.Users, {
        foreignKey: 'userId'
    });
};

module.exports = {
    CmsPage,
    ContactUs,
    FAQ,
    FaqCategory
}
