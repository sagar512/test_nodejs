const Config = require("../../../configs/configs");

let NotificationTemplate = sequelizeConnection.define('NotificationTemplate', {
    templateType: { type: DataTypes.STRING },
    templateKey: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    message: { type: DataTypes.STRING },
    userTypes: { type: DataTypes.JSON },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    image: { type: DataTypes.STRING }
}, {
    freezeTableName: true,
    paranoid: true
});


let Notification = sequelizeConnection.define('Notification', {
    type: { type: DataTypes.STRING },
    subType: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    message: { type: DataTypes.STRING },
    dataId: { type: DataTypes.INTEGER },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    userType: { type: DataTypes.STRING },
    image: {
        type: DataTypes.STRING,
        get() {
            let rawValue = this.getDataValue('image');
            return rawValue ? Config.azureUrl + rawValue : null;
        }
    }
}, {
    freezeTableName: true,
    paranoid: true
});

Notification.associate = (models) => {
    models.Notification.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};


let NotificationAdmin = sequelizeConnection.define('NotificationAdmin', {
    type: { type: DataTypes.STRING },
    subType: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    message: { type: DataTypes.STRING },
    dataId: { type: DataTypes.INTEGER },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    userType: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING }
}, {
    freezeTableName: true,
    paranoid: true
});

NotificationAdmin.associate = (models) => {
    models.NotificationAdmin.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};


module.exports = {
    NotificationTemplate,
    Notification,
    NotificationAdmin
}