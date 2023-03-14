let Admin = sequelizeConnection.define('Admin', {
    firstname: { type: DataTypes.STRING },
    lastname: { type: DataTypes.STRING },
    username: { type: DataTypes.STRING },
    emailId: { type: DataTypes.STRING, unique: true },
    password: { type: DataTypes.STRING },
    photo: { type: DataTypes.STRING },
    emailVerificationStatus: { type: DataTypes.BOOLEAN, defaultValue: true },
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
    mobile: { type: DataTypes.STRING },
    verificationToken: { type: DataTypes.STRING },
    verificationTokenCreationTime: { type: DataTypes.DATE },
    fbId: { type: DataTypes.STRING },
    twitterId: { type: DataTypes.STRING },
    instagramId: { type: DataTypes.STRING },
    forgotToken: { type: DataTypes.STRING },
    forgotTokenCreationTime: { type: DataTypes.DATE },
    deviceToken: { type: DataTypes.STRING },
    device: { type: DataTypes.STRING },
    lastSeen: { type: DataTypes.DATE }
}, {
    freezeTableName: true
});

Admin.associate = (models) => {
    // models.Admin.belongsTo(models.RolesSchema, {
    //     foreignKey: 'roleId'
    // });
    models.Admin.belongsTo(models.Admin, {
        foreignKey: 'addedBy'
    });
};

module.exports = {
    Admin
}