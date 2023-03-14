let Coupon = sequelizeConnection.define('Coupon', {
    couponCode: { type: DataTypes.STRING },
    minOrderAmount: { type: DataTypes.INTEGER },
    discountType: { type: DataTypes.ENUM('Flat', 'Percentage') },
    discount: { type: DataTypes.FLOAT },
    fromDate: { type: DataTypes.DATE },
    toDate: { type: DataTypes.DATE },
    countUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
    isForAllChef: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    freezeTableName: true,
    paranoid: true
});

Coupon.associate = (models) => {
    models.Coupon.belongsToMany(models.Users, {
        through: 'CouponForChef'
    });
};

module.exports = {
    Coupon
}