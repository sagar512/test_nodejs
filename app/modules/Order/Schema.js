const _ = require('lodash');
const config = require('../../../configs/configs');

let Order = sequelizeConnection.define('Order', {
    orderUnique: { type: DataTypes.STRING },
    subTotal: { type: DataTypes.FLOAT },
    taxAmount: { type: DataTypes.FLOAT },
    discountAmount: { type: DataTypes.FLOAT },

    promoCode: { type: DataTypes.STRING },
    promoCodeApplyStatus: { type: DataTypes.BOOLEAN, defaultValue: false },

    refundAmount: { type: DataTypes.FLOAT },
    isRefundPaid: { type: DataTypes.BOOLEAN, defaultValue: false },

    customTipAmount: { type: DataTypes.FLOAT },
    percentageTip: { type: DataTypes.FLOAT },
    isCustomTipStatus: { type: DataTypes.BOOLEAN, defaultValue: false },
    isPercentageTipStatus: { type: DataTypes.BOOLEAN, defaultValue: false },

    tipAmount: { type: DataTypes.FLOAT },
    deliveryAmount: { type: DataTypes.FLOAT },
    totalAmount: { type: DataTypes.FLOAT },
    totalItem: { type: DataTypes.FLOAT },
    remark: { type: DataTypes.STRING(1024) },
    addressCustomer: { type: DataTypes.JSON },
    distance: { type: DataTypes.FLOAT },

    customerName: { type: DataTypes.STRING },
    chefName: { type: DataTypes.STRING },
    driverName: { type: DataTypes.STRING },

    chefInfo: { type: DataTypes.JSON },
    customerInfo: { type: DataTypes.JSON },
    driverInfo: { type: DataTypes.JSON },
    addressChef: { type: DataTypes.JSON },
    ratedByCustomer: { type: DataTypes.BOOLEAN, defaultValue: false },
    orderDate: { type: DataTypes.DATE },

    chefAmount: { type: DataTypes.FLOAT },
    driverAmount: { type: DataTypes.FLOAT },
    isChefPaid: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDriverPaid: { type: DataTypes.BOOLEAN, defaultValue: false },

    //payment related stuff
    paymentIntentId: { type: DataTypes.STRING },
    stripeCustomerId: { type: DataTypes.STRING },
    paymentIntentStatus: {
        type: Sequelize.ENUM,
        values: ['CustomerPay', 'ChefAcceptPay'],
    },


    orderType: {
        type: Sequelize.ENUM,
        values: ['Delivery', 'Take away'],
        defaultValue: 'Delivery'
    },
    orderStatus: {
        type: Sequelize.ENUM,
        values: ['Cart', 'Checkout', 'Pending', 'Approved', 'Accepted', 'Rejected', 'Cancelled', 'Confirmed', 'Under Preparation', 'Prepared', 'Picked Up', 'Delivered'],
        defaultValue: 'Pending'
    },
    paymentStatus: {
        type: Sequelize.ENUM,
        values: ['Pending', 'Paid', 'Not Paid'],
        defaultValue: 'Pending'
    },
    orderDishType: {
        type: Sequelize.ENUM,
        values: ['PreOrder', 'Normal'],
        defaultValue: 'Normal'
    }
}, {
    freezeTableName: true,
    paranoid: true
});

Order.associate = (models) => {
    models.Order.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
    models.Order.belongsTo(models.Users, {
        as: 'chef',
        foreignKey: 'chefId',
        onDelete: 'cascade'
    });
    models.Order.belongsTo(models.Users, {
        as: 'driver',
        foreignKey: 'driverId',
        onDelete: 'cascade'
    });
    models.Order.hasMany(models.OrderStatusTimeline, {
        foreignKey: 'orderId',
        onDelete: 'cascade'
    });
    models.Order.hasMany(models.OrderDetails, {
        foreignKey: 'orderId',
        onDelete: 'cascade'
    });
    models.Order.belongsTo(models.Kitchen, {
        foreignKey: 'kitchenId',
        onDelete: 'cascade'
    });
};

let OrderDetails = sequelizeConnection.define('OrderDetails', {
    price: { type: DataTypes.FLOAT },
    quantity: { type: DataTypes.FLOAT },
    totalPrice: { type: DataTypes.FLOAT },
    dishInfo: {
        type: DataTypes.JSON,
        get() {
            let rawValue = this.getDataValue('dishInfo');
            if (rawValue) {
                rawValue.media = rawValue.media.map(a => {
                    a.url = config.azureUrl + a.url;
                    a.thumbnailUrl = config.azureUrl + a.thumbnailUrl;
                    return a;
                });
            }
            return rawValue;
        }
    },
    attribute: { type: DataTypes.JSON }
}, {
    freezeTableName: true,
    paranoid: true
});

OrderDetails.associate = (models) => {
    models.OrderDetails.belongsTo(models.Order, {
        foreignKey: 'orderId',
        onDelete: 'cascade'
    });
    models.OrderDetails.belongsTo(models.Dish, {
        foreignKey: 'dishId',
        onDelete: 'cascade'
    });
    models.OrderDetails.belongsTo(models.Users, {
        foreignKey: 'userId',
        onDelete: 'cascade'
    });
};

let OrderStatusTimeline = sequelizeConnection.define('OrderStatusTimeline', {
    orderStatus: {
        type: Sequelize.ENUM,
        values: ['Confirmed', 'Under Preparation', 'Prepared', 'Picked Up', 'Delivered']
    }
}, {
    freezeTableName: true,
    paranoid: true
});

OrderStatusTimeline.associate = (models) => {
    models.OrderStatusTimeline.belongsTo(models.Order, {
        foreignKey: 'orderId',
        onDelete: 'cascade'
    });
};

module.exports = {
    Order,
    OrderDetails,
    OrderStatusTimeline
}