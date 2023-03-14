let Settings = sequelizeConnection.define('Settings', {
    commission_food_order: { type: DataTypes.FLOAT },
    commission_delivery: { type: DataTypes.FLOAT },
    commission_kitchen_booking: { type: DataTypes.FLOAT },
    payout_days_chef: { type: DataTypes.INTEGER },
    payout_days_delivery_partner: { type: DataTypes.INTEGER },
    payout_days_kitchen_partner: { type: DataTypes.INTEGER },
    acceptance_hours_pre_order: { type: DataTypes.INTEGER },
    acceptance_mins_food_order: { type: DataTypes.INTEGER },
    acceptance_secs_delivery_order: { type: DataTypes.INTEGER },
    acceptance_hours_kitchen_booking: { type: DataTypes.INTEGER },
    delivery_fees: { type: DataTypes.JSON },
    app_search_radius: { type: DataTypes.JSON },
    meta_data: { type: DataTypes.JSON }
}, {
    freezeTableName: true
});

module.exports = {
    Settings
}