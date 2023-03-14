const config = require('../../../configs/configs');
const _ = require('lodash');

let Users = sequelizeConnection.define('Users', {
    firstName: { type: DataTypes.STRING },
    lastName: { type: DataTypes.STRING },
    emailId: { type: DataTypes.STRING, unique: true },
    status: {
        type:   Sequelize.ENUM,
        values: ['Active', 'Inactive'],
        defaultValue:'Active'
      },
      adminStatus:{
        type:   Sequelize.ENUM,
        values: ['Pending','Approved', 'Rejected'],
        defaultValue:'Pending'
      }, 
      completeProfileStatus:{
        type:   Sequelize.ENUM,
        values: ['Complete', 'Uncompleted'],
        defaultValue:'Uncompleted'
      }, 
    photo: {
      type: DataTypes.STRING,
      get() {
          let rawValue = this.getDataValue('photo');
          return rawValue ? config.azureUrl+rawValue : null;
      }
  },
    role: {
        type:   Sequelize.ENUM,
        values: ['Customer', 'Chef', 'Kitchen','Delivery']
      },
    fbId: { type: DataTypes.STRING },
    googleId: { type: DataTypes.STRING },
    appleId: { type: DataTypes.STRING },
    

   
    countryCode:{ type: DataTypes.STRING },
    mobile: { type: DataTypes.STRING },
    addressOne: { type: DataTypes.STRING },
    addressTwo: { type: DataTypes.STRING },
    country:{type:DataTypes.STRING},

    uniqueId:{type:DataTypes.STRING},
    longitude:{type:DataTypes.STRING},
    latitude:{type:DataTypes.STRING},
    addressPoint: {
      type: Sequelize.GEOMETRY('POINT'),
      coordinates: [],
      allowNull: true
  },

    city: { type: DataTypes.STRING },
    state: { type: DataTypes.STRING },
    zipcode: { type: DataTypes.STRING },
  

    totalRating:{ type: DataTypes.INTEGER,defaultValue:0}, //total count for rating 
    avgRate:{ type: DataTypes.FLOAT,defaultValue:0},
    isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },

    topDishSelling: {type: DataTypes.INTEGER,defaultValue:0},

    //stripe 
    stripeCustomerId:{type:DataTypes.STRING},
    
    password: { type: DataTypes.STRING },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    temporaryCountryCode:{type:DataTypes.STRING},
    temporaryMobile:{type:DataTypes.STRING},
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verificationCode:{type:DataTypes.STRING},
    expireVerificationCode:{type:DataTypes.DATE},
    verificationToken: { type: DataTypes.STRING },
    verificationTokenCreationTime: { type: DataTypes.DATE },
    verificationType: { type: DataTypes.STRING },
    forgotToken: { type: DataTypes.STRING },
    forgotTokenCreationTime: { type: DataTypes.DATE },
    deviceToken: { type: DataTypes.STRING },
    device: { type: DataTypes.STRING },

    previouslyUsedPasswords: { type: DataTypes.TEXT },
    passwordUpdatedAt: { type: DataTypes.DATE },
    lastSeen: { type: DataTypes.DATE },
    failedAttempts: { type: DataTypes.JSON },

    totalRatingStar: { type: DataTypes.JSON },
	  totalComplements: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalComplementsType: { type: DataTypes.JSON },
    accountDeactivated: { type: DataTypes.BOOLEAN, defaultValue: false },
  
    // failedAttempts: [{ ip: { type: DataTypes.STRING }, attempts: { type: Number }, blockedDate: { type: Date }, isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false } }]
}, {
        freezeTableName: true
    });

// Users.associate = (models) => {
//     models.Users.belongsTo(models.Countries, {
//         foreignKey: 'countryId'
//     });
// };
Users.associate = (models) => {

    models.Users.belongsToMany(models.Cuisine, {
        through: 'ChefCuisine'
    });

    models.Users.hasOne(models.Address, {
      as: 'chefAddress',
      foreignKey: 'userId',
      onDelete: 'cascade'
    });
};

let RatingUser = sequelizeConnection.define('RatingUser', {
	rating: { type: DataTypes.FLOAT, defaultValue: 0 },
  complements: { type: DataTypes.JSON },
  comment: { type: DataTypes.STRING }
}, {
    freezeTableName: true,
    paranoid: true,
    hooks: {
      afterCreate: async (instance, options) => {
        let partnerUser = await Users.findOne({ where: { id: instance.partnerId } })
        let updateData = await RatingUser.findOne({
          attributes: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'totalRating'], [Sequelize.fn('AVG', Sequelize.col('rating')), 'avgRate']],
          where: { partnerId: instance.partnerId },
          raw: true
        });
  
        updateData.avgRate = Math.round(updateData.avgRate * 100) / 100;

        let a = ['','one','two','three','four','five'];
        updateData.totalRatingStar = partnerUser.totalRatingStar;
        updateData.totalRatingStar[`${a[instance.rating]}Star`] += 1;

        if (instance.complements) {
          updateData.totalComplementsType = partnerUser.totalComplementsType || {};
          updateData.totalComplements = partnerUser.totalComplements;
          _.map(instance.complements, (key) => {
            if (updateData.totalComplementsType[key]) {
              updateData.totalComplementsType[key] += 1;
            } else {
              updateData.totalComplementsType[key] = 1;
            }
            updateData.totalComplements += 1;
          });
        }
  
        await Users.update(updateData, { where: { id: instance.partnerId }});
      }
  }
});

RatingUser.associate = (models) => {
    models.RatingUser.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
	});
	models.RatingUser.belongsTo(models.Users, {
		as: 'partnerUser',
        foreignKey: 'partnerId',
        onDelete: 'cascade'
    });
  models.RatingUser.belongsTo(models.Order, {
    foreignKey: 'orderId',
    onDelete: 'cascade'
  });
};

let UserComplementsType = sequelizeConnection.define('UserComplementsType', {
	name: { type: DataTypes.STRING },
	image: {
		type: DataTypes.STRING,
		get() {
			let rawValue = this.getDataValue('image');
      return rawValue ? config.azureUrl+rawValue : null;
    }
  }
}, {
  freezeTableName: true,
	paranoid: true
});

module.exports = {
    Users,
    RatingUser,
    UserComplementsType
}