const _ = require('lodash');
const config = require('../../../configs/configs'); 

let NewsFeed = sequelizeConnection.define('NewsFeed', {
    title: { type: DataTypes.STRING },
    description: { type: DataTypes.STRING(1024) },
    imagesPath: {
        type: DataTypes.JSON,
        get() {
            let rawValue = this.getDataValue('imagesPath');
            if (rawValue) {
                return _.map(rawValue, a => {
                    a.url = config.azureUrl + a.url;
                    a.thumbnailUrl = config.azureUrl + a.thumbnailUrl;
                    return a;
                });
            } else {
                return null;
            }
        }
    },
    videoUrl: { type: DataTypes.STRING },
    totalComment: { type: DataTypes.INTEGER, defaultValue: 0 },
    longitude: { type: DataTypes.STRING },
	latitude: { type: DataTypes.STRING },
	addressPoints: {
		type: Sequelize.GEOMETRY('POINT'),
		coordinates: [],
		allowNull: true
	},
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    freezeTableName: true,
    paranoid: true
});

NewsFeed.associate = (models) => {
    models.NewsFeed.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};

let NewsFeedComment = sequelizeConnection.define('NewsFeedComment', {
    comment: { type: DataTypes.STRING }
}, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    freezeTableName: true,
    paranoid: true,
    hooks: {
        afterCreate: async (instance, options) => {
            let totalComment = await NewsFeedComment.count({ where: { newsFeedId: instance.newsFeedId }});
            await NewsFeed.update({ totalComment }, { where: { id: instance.newsFeedId }});
        },
        afterDestroy: async (instance, options) => {
            let totalComment = await NewsFeedComment.count({ where: { newsFeedId: instance.newsFeedId }});
            await NewsFeed.update({ totalComment }, { where: { id: instance.newsFeedId }});
        }
    }
});

NewsFeedComment.associate = (models) => {
    models.NewsFeedComment.belongsTo(models.NewsFeed, {
        foreignKey: 'newsFeedId',
        onDelete: 'cascade'
    });
    models.NewsFeedComment.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};

module.exports = {
    NewsFeed,
    NewsFeedComment
}