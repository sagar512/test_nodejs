const _ = require('lodash');
const i18n = require("i18n");

const Controller = require('../Base/Controller');
const Model = require("../Base/Model");
const Order = require('./Schema').Order;
const OrderDetails = require('./Schema').OrderDetails;
const OrderStatusTimeline = require('./Schema').OrderStatusTimeline;
const Address = require('../ManageAddress/Schema').Address;
const Dish = require('../Dish/Schema').Dish;
const RatingDish = require('../Dish/Schema').RatingDish;
const Users = require('../User/Schema').Users;
const RatingUser = require('../User/Schema').RatingUser;
const UserComplementsType = require('../User/Schema').UserComplementsType;
const Attribute = require('../Dish/Schema').Attribute;
const Coupon = require('../Coupon/Schema').Coupon;
const Favourites = require('../Favourite/Schema').Favourites;
const CommonService = require("../../services/Common");
const exportLib = require('../../../lib/Exports');
const { at, zip, result } = require('lodash');
const Form = require("../../services/Form");
const File = require("../../services/File");
const config = require('../../../configs/configs');
let moment = require('moment');
const { limit255 } = require('jimp');
const { json } = require('body-parser');
const { generateDevelopmentStorageCredentials } = require('azure-storage');
const PushNotification = require('../../services/PushNotification');
const Stripe = require("../../services/Strip");
//const { or } = require('sequelize/types/lib/operators');
const NotificationTemplateSchema = require('../Notification/Schema').NotificationTemplate;
const NotificationAdminSchema = require('../Notification/Schema').NotificationAdmin;
const NotificationSchema = require('../Notification/Schema').Notification;
const SettingsSchema = require('../Settings/Schema').Settings;
const KitchenSchema = require('../Kitchen/Schema').Kitchen;
const CountriesSchema = require('../Countries/Schema').Countries;

const Mustache = require('mustache');

//var io = require('socket.io-emitter')({ host: '127.0.0.1', port: 6379 });
// const client = require('../../../configs/redis')
// dlet test = client()

const redis = require('redis');
const client = redis.createClient({
    host: config.redisUrl,
    port: config.redisPort,
    password: config.redisPassword
});
var io = require('socket.io-emitter')(client);

// var client = redis.createClient(6379, 'localhost');
//const client = redis.createClient();







class OrderController extends Controller {

    constructor() {
        super();
    }
    getNextPage(page, limit, total) {
            //var page = Number(page),
            var limits = Number(limit),
                counts = Number(total);
            var divide = counts / limits;
            var lastPage = Math.ceil(divide);
            // if (page < lastPage) return page + 1;
            //return 0;
            return lastPage
        }
        /********************************************************
         Purpose:Attribute list
         Parameter:
         {
                "userId":1,         
                "page":1,
         }
         Return: JSON String
         ********************************************************/
    async cartDetails() {
        try {
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }


            let cartDetails = await Order.findOne({
                attributes: ['id'],
                where: { userId: this.req.body.userId, orderStatus: 'Cart' }
            })
            if (_.isEmpty(cartDetails)) {
                return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });
            }
            await this.inUpdateOrderDetailInfo(cartDetails.id);

            cartDetails = await Order.findOne({
                attributes: ["id", "orderType", "orderUnique", "subTotal", "taxAmount", "discountAmount", "tipAmount", "deliveryAmount",
                    "totalAmount", "totalItem", "addressCustomer", "orderStatus", "orderDishType", 'chefId', 'isCustomTipStatus', 'isPercentageTipStatus', 'promoCodeApplyStatus', 'promoCode', 'customTipAmount', 'percentageTip'
                ],
                include: [{
                    model: OrderDetails,
                    attributes: ['price', 'quantity', 'attribute', 'totalPrice'],
                    include: { model: Dish, attributes: ['id', 'name', 'type', 'media'], paranoid: false }
                }, ],
                where: { id: cartDetails.id }
            })
            if (_.isEmpty(cartDetails)) {
                return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });
            }

            let jsonValue = cartDetails.toJSON();

            await Promise.all(jsonValue.OrderDetails.map((cartValue, key) => {
                jsonValue.OrderDetails[key] = {
                    "id": cartValue.Dish.id,
                    "price": '$' + ' ' + cartValue.price,
                    "quantity": cartValue.quantity,
                    "attribute": cartValue.attribute,
                    "totalPrice": '$' + ' ' + cartValue.totalPrice,
                    "dishName": cartValue.Dish.name,
                    "dishMedia": cartValue.Dish.media,
                    "dishType": cartValue.Dish.type
                }


            }))
            let todayDate = moment().format('YYYY-MM-DD');
            // let todayTime = moment().format("HH:MM:SS");


            let chefCouponList = await Coupon.findAll({
                include: {
                    model: Users,
                    attributes: [],
                    through: {
                        attributes: []
                    }
                },
                where: {
                    [Op.or]: [{ '$Users.id$': jsonValue.chefId }, { 'isForAllChef': true }],
                    fromDate: sequelizeConnection.literal(`DATE(fromDate) <= '${todayDate}'`),
                    toDate: sequelizeConnection.literal(`DATE(toDate) >= '${todayDate}'`)
                },
                subQuery: false
            })


            //let discountCode = false && chefCouponList.length != 0 && chefCouponList[0].couponCode ? chefCouponList[0].couponCode : ''
            let discountCode = chefCouponList.length != 0 && chefCouponList[0].couponCode ? chefCouponList[0].couponCode : ''
                // let deliveryTotalAmount 
                // let totalAmount
                //    if(jsonValue.deliveryAmount == 0)
                //    {
                //       deliveryTotalAmount = 5
                //       totalAmount = jsonValue.totalAmount + deliveryTotalAmount

            //    }
            //    else if(jsonValue.deliveryAmount != 0)
            //    {
            //         deliveryTotalAmount = jsonValue.deliveryAmount
            //         totalAmount = jsonValue.totalAmount 
            //    } 
            //    let updateOrder= {
            //     deliveryAmount: deliveryTotalAmount,
            //     totalAmount: totalAmount,
            // }
            // await Order.update(updateOrder,{where:{id:cartDetails.id}});


            var date = new Date();
            date.setDate(date.getDate() + 2);


            let responseCart = {
                "id": jsonValue.id,
                chefId: jsonValue.chefId,
                "orderType": jsonValue.orderType,
                "orderUnique": jsonValue.orderUnique,
                "subTotal": '$' + ' ' + (jsonValue.subTotal).toFixed(2),
                "taxAmount": '$' + ' ' + (jsonValue.taxAmount).toFixed(2),
                "discountAmount": '$' + ' ' + (jsonValue.discountAmount).toFixed(2),
                "tipAmount": '$' + ' ' + (jsonValue.tipAmount).toFixed(2),
                "deliveryAmount": '$' + ' ' + (jsonValue.deliveryAmount).toFixed(2),
                "totalAmount": '$' + ' ' + (jsonValue.totalAmount).toFixed(2),
                promoCode: discountCode,
                promoCodeApplyStatus: jsonValue.promoCodeApplyStatus ? jsonValue.promoCodeApplyStatus : false,
                "totalItem": jsonValue.totalItem,
                "addressCustomer": jsonValue.addressCustomer,
                "orderStatus": jsonValue.orderStatus,
                "orderDishType": jsonValue.orderDishType,
                "OrderDetails": jsonValue.OrderDetails,
                serverDateTime: date,
                customTipAmount: jsonValue.customTipAmount,
                percentageTip: jsonValue.percentageTip,
                isCustomTipStatus: jsonValue.isCustomTipStatus,
                isPercentageTipStatus: jsonValue.isPercentageTipStatus,
            }






            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: "", data: responseCart });

        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
     Purpose: add to cart
     Parameter:
     {
            "userId":1,
            "dishId": 1,
     }
     Return: JSON String
     ********************************************************/
    async addToCart() {
        try {

            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            if (!this.req.body.type) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            if (this.req.body.type == 'add') {


                //getting customer address details
                let addressUserDetails = await Address.findOne({ where: { userId: this.req.body.userId, primaryAddressStatus: true } });
                let searchLat = addressUserDetails.latitude
                let searchLng = addressUserDetails.longitude
                let distanceQuery = `ST_Distance_Sphere(addressPoint, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                //getting chef details
                let dishChefDetails = await Dish.findOne({ where: { id: this.req.body.dishId } });
                if (_.isEmpty(dishChefDetails) || dishChefDetails.dishStatus == 'Unpublish') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.DISH_DELETED });
                }
                if (dishChefDetails.saleType == 'Sold Out') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.DISH_SOLD });
                }


                //check distance customer and chef distance 
                let checkChefDistance = await Address.findOne({
                    attributes: ['id', [sequelizeConnection.literal(distanceQuery), 'distance']],
                    having: {
                        distance: {
                            [Op.lt]: 14
                        }
                    },
                    where: { userId: dishChefDetails.userId }
                });
                if (checkChefDistance) {
                    //getting order 
                    let order = await Order.findOne({ where: { userId: this.req.body.userId, orderStatus: 'Cart' } });
                    if (!order) {


                        //getting dish details 
                        let dishId = await Dish.findOne({ where: { id: this.req.body.dishId } });

                        //getting customer address details
                        let addressDetails = await Address.findOne({ where: { userId: this.req.body.userId, primaryAddressStatus: true } });
                        let addressCustomerObject = {
                            addressOne: addressDetails.addressOne,
                            addressTwo: addressDetails.addressTwo,
                            addressType: addressDetails.addressType,
                            country: addressDetails.country,
                            state: addressDetails.state,
                            city: addressDetails.city,
                            zipcode: addressDetails.zipcode
                        }


                        //random number generated 
                        let randomNumber = _.floor(100000 + _.random(0.1,  1.0) * 900000);

                        checkChefDistance = checkChefDistance.toJSON();

                        let setObject = {
                            chefId: dishId.userId,
                            userId: this.req.body.userId,
                            orderUnique: 'FJFO' + randomNumber,
                            subTotal: 0,
                            taxAmount: 0,
                            discountAmount: 0,
                            tipAmount: 0,
                            distance: Math.round(checkChefDistance.distance * 100) / 100,
                            deliveryAmount: await this.getDeliveryFee(checkChefDistance.distance),
                            totalAmount: 0,
                            totalItem: 0,
                            orderStatus: 'Cart',
                            orderDishType: dishId.isPreOrderOnly == true ? 'PreOrder' : 'Normal',
                            orderDate: new Date(),
                            addressCustomer: addressCustomerObject,
                            //addressChef: addressChefObject,
                        }

                        let orderId = await Order.create(setObject);
                        let totalAttributePrice = 0
                        let qty
                        let totalDishPrice
                        let selectedAttribute = []
                        let requestAttribute = this.req.body.attribute ? this.req.body.attribute : []
                        if (dishId.attribute && requestAttribute.length != 0) {
                            await Promise.all(dishId.attribute.map(async(attributes, key) => {
                                let name = await Attribute.findOne({ where: { id: attributes.id } })
                                if (!(attributes.isSelected === false) && !_.isEmpty(name)) {
                                    await Promise.all(requestAttribute.map(reqAttribute => {
                                        if (reqAttribute == attributes.id) {
                                            totalAttributePrice += Number(attributes.price)
                                            let object = {
                                                "id": attributes.id,
                                                "name": name.name,
                                                "price": '$' + attributes.price
                                            }
                                            selectedAttribute.push(object)
                                        }
                                    }))
                                }
                            }))
                            qty = Number(this.req.body.quantity)
                            totalDishPrice = (dishId.price + totalAttributePrice) * qty
                        } else {
                            qty = Number(this.req.body.quantity)
                            totalDishPrice = (dishId.price + totalAttributePrice) * qty
                        }

                        //console.log(totalDishPrice,'totalDishPrice')
                        let orderDetailsObject = {
                            price: dishId.price,
                            quantity: this.req.body.quantity,
                            totalPrice: totalDishPrice,
                            attribute: selectedAttribute.length != 0 ? selectedAttribute : [],
                            dishId: this.req.body.dishId,
                            orderId: orderId.id,
                            userId: this.req.body.userId,
                        }
                        await OrderDetails.create(orderDetailsObject);

                        await this.inUpdateOrderInfo(orderId.id);
                        //  //getting customer address details
                        // let addressChefDetails = await Users.findOne({ where: { id:this.req.body.userId}});
                        // let addressChefObject = {
                        //     addressOne:addressChefDetails.addressOne,
                        //     addressTwo:addressChefDetails.addressTwo,
                        //     addressType:addressChefDetails.addressType,
                        //     country:addressChefDetails.country,
                        //     state:addressChefDetails.state,
                        //     city:addressChefDetails.city,
                        //     zipcode:addressChefDetails.zipcode
                        // }

                        /* let updateOrder= {
                            subTotal: totalDishPrice,
                            totalAmount: totalDishPrice,
                            totalItem: 1,
                            orderDishType:dishId.isPreOrderOnly == true ? 'PreOrder' : 'Normal'
                        // addressChef:addressChefObject
                        }
                            await Order.update(updateOrder,{where:{id:orderId.id}}); */
                        return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ADD_TO_CART });
                    } else {

                        //getting dish details 
                        let dishId = await Dish.findOne({ where: { id: this.req.body.dishId } });


                        //checking order dish type     
                        if (order.orderDishType != 'PreOrder' && dishId.isPreOrderOnly == false) {


                            if (dishId.userId == order.chefId) {
                                let checkOrderDish = await OrderDetails.findOne({ where: { orderId: order.id, dishId: this.req.body.dishId } })
                                if (checkOrderDish) {
                                    let totalAttributePrice = 0
                                    let qty
                                    let totalDishPrice
                                    let selectedAttribute = []
                                    let requestAttribute = this.req.body.attribute ? this.req.body.attribute : []
                                    console.log(requestAttribute, 'request attribute')
                                    if (dishId.attribute && requestAttribute.length != 0) {
                                        await Promise.all(dishId.attribute.map(async(attributes, key) => {
                                            let name = await Attribute.findOne({ where: { id: attributes.id } })
                                            if (!(attributes.isSelected === false) && !_.isEmpty(name)) {
                                                await Promise.all(requestAttribute.map(reqAttribute => {
                                                    if (reqAttribute == attributes.id) {
                                                        totalAttributePrice += Number(attributes.price)
                                                        let object = {
                                                            "id": attributes.id,
                                                            "name": name.name,
                                                            "price": '$' + attributes.price
                                                        }
                                                        selectedAttribute.push(object)
                                                    }
                                                }))
                                            }
                                        }))
                                        qty = Number(this.req.body.quantity)
                                        totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                    } else {
                                        qty = Number(this.req.body.quantity)
                                        totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                    }

                                    //console.log(totalDishPrice,'totalDishPrice')
                                    let orderDetailsObject = {
                                        price: dishId.price,
                                        quantity: this.req.body.quantity,
                                        totalPrice: totalDishPrice,
                                        attribute: selectedAttribute.length != 0 ? selectedAttribute : [],
                                        dishId: this.req.body.dishId,
                                        orderId: order.id,
                                        userId: this.req.body.userId,
                                    }
                                    await OrderDetails.update(orderDetailsObject, { where: { id: checkOrderDish.id } });

                                    await this.inUpdateOrderInfo(order.id);

                                    //calculation subtotal and totalAmount
                                    /* let orderDetailsCount = await OrderDetails.count({where:{orderId:order.id,userId:this.req.body.userId}});
                                                        let subtotalAmount
                                                        let totalAmount
                                                        if(orderDetailsCount != 1)
                                                        {
                                                                    let orderSubTotal = await OrderDetails.findOne({
                                                                        attributes: [[Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'subTotal']],
                                                                        where: { orderId:order.id},
                                                                        raw: true
                                                                    });
                                                                    subtotalAmount =  orderSubTotal.subTotal
                                                                    totalAmount = orderSubTotal.subTotal + order.taxAmount + order.deliveryAmount + order.tipAmount  - order.discountAmount               

                                                        }
                                                        else if(orderDetailsCount == 1)
                                                        {
                                                            subtotalAmount =  totalDishPrice
                                                            totalAmount = order.taxAmount + order.deliveryAmount + order.tipAmount + totalDishPrice - order.discountAmount               

                                                        }
                        
                                                    // //calculation subtotal and totalAmount
                                                    // let subtotalAmount =  subtotalAmount
                                                    // let totalAmount = totalDishPrice + order.deliveryAmount + order.tipAmount + order.taxAmount - order.discountAmount
                                                    let totalItemCount = await OrderDetails.findAll({where:{orderId:order.id}})
                        
                                                    let updateOrder= {
                                                        subTotal: subtotalAmount,
                                                        totalAmount: totalAmount,
                                                        totalItem: totalItemCount.length,
                                                    }
                                                   
                                                    await Order.update(updateOrder,{where:{id:order.id}}); */
                                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ADD_TO_CART });

                                } else {
                                    let totalAttributePrice = 0
                                    let qty
                                    let totalDishPrice
                                    let selectedAttribute = []
                                    let requestAttribute = this.req.body.attribute ? this.req.body.attribute : []
                                    if (dishId.attribute && requestAttribute.length != 0) {
                                        await Promise.all(dishId.attribute.map(async(attributes, key) => {
                                            let name = await Attribute.findOne({ where: { id: attributes.id } })
                                            if (!(attributes.isSelected === false) && !_.isEmpty(name)) {
                                                await Promise.all(requestAttribute.map(reqAttribute => {

                                                    if (reqAttribute == attributes.id) {
                                                        totalAttributePrice += Number(attributes.price)
                                                        let object = {
                                                            "id": attributes.id,
                                                            "name": name.name,
                                                            "price": '$' + attributes.price
                                                        }
                                                        selectedAttribute.push(object)
                                                    }
                                                }))
                                            }
                                        }))
                                        qty = Number(this.req.body.quantity)
                                        totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                    } else {
                                        qty = Number(this.req.body.quantity)
                                        totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                    }

                                    //console.log(totalDishPrice,'totalDishPrice')
                                    let orderDetailsObject = {
                                        price: dishId.price,
                                        quantity: this.req.body.quantity,
                                        totalPrice: totalDishPrice,
                                        attribute: selectedAttribute.length != 0 ? selectedAttribute : [],
                                        dishId: this.req.body.dishId,
                                        orderId: order.id,
                                        userId: this.req.body.userId,
                                    }
                                    await OrderDetails.create(orderDetailsObject);

                                    await this.inUpdateOrderInfo(order.id);

                                    //calculation subtotal and totalAmount
                                    /* let subtotalAmount = order.subTotal + totalDishPrice
                                                    let totalAmount = order.totalAmount + totalDishPrice 
                                                    
                                                    let totalItemCount = await OrderDetails.findAll({where:{orderId:order.id}})
                        
                                                    let updateOrder= {
                                                        subTotal: subtotalAmount,
                                                        totalAmount: totalAmount,
                                                        totalItem: totalItemCount.length,
                                                    }
                                                    
                                                    await Order.update(updateOrder,{where:{id:order.id}}); */
                                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ADD_TO_CART });

                                }
                            } else if (dishId.userId != order.chefId) {
                                return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.DIFFERENT_CHEF });
                            }
                        } else if (order.orderDishType == 'Normal' && dishId.isPreOrderOnly == true) {
                            return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.NORMAL_ORDER_CHEF_CHECK });
                        } else if (order.orderDishType == 'PreOrder') {
                            let checkPrOrder = await OrderDetails.findOne({ where: { orderId: order.id, dishId: this.req.body.dishId, userId: this.req.body.userId } })
                            let checkOrderDetailsDish = await OrderDetails.findOne({ where: { orderId: order.id, dishId: this.req.body.dishId } })
                            if (checkPrOrder) {
                                let totalAttributePrice = 0
                                let qty
                                let totalDishPrice
                                let selectedAttribute = []
                                let requestAttribute = this.req.body.attribute ? this.req.body.attribute : []
                                if (dishId.attribute && requestAttribute.length != 0) {
                                    await Promise.all(dishId.attribute.map(async(attributes, key) => {
                                        let name = await Attribute.findOne({ where: { id: attributes.id } })
                                        if (!(attributes.isSelected === false) && !_.isEmpty(name)) {
                                            await Promise.all(requestAttribute.map(reqAttribute => {
                                                if (reqAttribute == attributes.id) {
                                                    totalAttributePrice += Number(attributes.price)
                                                    let object = {
                                                        "id": attributes.id,
                                                        "name": name.name,
                                                        "price": '$' + attributes.price
                                                    }
                                                    selectedAttribute.push(object)
                                                }
                                            }))
                                        }
                                    }))
                                    qty = Number(this.req.body.quantity)
                                    totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                } else {
                                    qty = Number(this.req.body.quantity)
                                    totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                }

                                //console.log(totalDishPrice,'totalDishPrice')
                                let orderDetailsObject = {
                                    price: dishId.price,
                                    quantity: this.req.body.quantity,
                                    totalPrice: totalDishPrice,
                                    attribute: selectedAttribute.length != 0 ? selectedAttribute : [],
                                    dishId: this.req.body.dishId,
                                    orderId: order.id,
                                    userId: this.req.body.userId,
                                }
                                await OrderDetails.update(orderDetailsObject, { where: { id: checkOrderDetailsDish.id } });

                                await this.inUpdateOrderInfo(order.id);

                                //calculation subtotal and totalAmount
                                /* let subtotalAmount = totalDishPrice
                                            let totalAmount = order.taxAmount + totalDishPrice + order.deliveryAmount + order.tipAmount - order.discountAmount
                                            let totalItemCount = await OrderDetails.findAll({where:{orderId:order.id}})
                
                                            let updateOrder= {
                                                subTotal: subtotalAmount,
                                                totalAmount: totalAmount,
                                                totalItem: totalItemCount.length,
                                            }
                                           
                                            await Order.update(updateOrder,{where:{id:order.id}}); */
                                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ADD_TO_CART });

                            } else {
                                return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.PRE_ORDER_CHEF_CHECK });
                            }


                        }
                    }
                } else {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.DISTANCE_CHEF_CHECK });
                }




            } else if (this.req.body.type == 'remove') {
                let order = await Order.findOne({ where: { userId: this.req.body.userId, orderStatus: 'Cart' } });
                if (_.isEmpty(order)) {
                    return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });
                }

                let checkOrderDetail = await OrderDetails.count({ where: { orderId: order.id } })
                if (checkOrderDetail == 0 || checkOrderDetail == 1) {
                    await Order.destroy({ where: { id: order.id } });
                    await OrderDetails.destroy({ where: { orderId: order.id } });
                } else if (checkOrderDetail != 1 && checkOrderDetail != 0) {

                    //getting dish details 
                    let dishId = await OrderDetails.findOne({ where: { dishId: this.req.body.dishId, orderId: order.id, userId: this.req.body.userId } });
                    await OrderDetails.destroy({ where: { dishId: this.req.body.dishId, orderId: order.id, userId: this.req.body.userId } });

                    await this.inUpdateOrderInfo(order.id);
                    //console.log(dishId,'dishId')
                    //calculation subtotal and totalAmount
                    /* let subtotalAmount = order.subTotal - dishId.totalPrice
                    let totalAmount = order.totalAmount - dishId.totalPrice
                    let totalItemCount = await OrderDetails.findAll({where:{orderId:order.id}})

                    let updateOrder= {
                        subTotal: subtotalAmount,
                        totalAmount: totalAmount,
                        totalItem: totalItemCount.length,
                    }
                    await Order.update(updateOrder,{where:{id:order.id}}); */


                }
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ADD_TO_CART_REMOVE });
            }

        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });

        }
    }

    async inUpdateOrderDetailInfo(orderId) {
        return new Promise(async(resolve, reject) => {
            try {
                let orderData = await Order.findOne({
                    include: {
                        model: OrderDetails,
                        attributes: ['id', 'attribute', 'quantity'],
                        include: { model: Dish, attributes: ['id', 'price', 'attribute', 'isPreOrderOnly'], paranoid: false }
                    },
                    where: { id: orderId }
                });

                let totalDishCount = orderData.OrderDetails.length,
                    removedDishCount = 0;
                await Promise.all(orderData.OrderDetails.map(async(a) => {
                    if (_.isEmpty(a.Dish) || (orderData.orderDishType == 'PreOrder' && !a.Dish.isPreOrderOnly) || (orderData.orderDishType == 'Normal' && a.Dish.isPreOrderOnly)) {
                        removedDishCount++;
                        // await OrderDetails.destroy({ where: { id: a.id } });
                    } else {
                        let totalAttributePrice = 0,
                            selectedAttribute = [];
                        if (a.attribute && a.Dish.attribute) {
                            await Promise.all(a.attribute.map(async(attr) => {
                                let dishAttr = a.Dish.attribute.find(dishA => dishA.id == attr.id && !(dishA.isSelected === false));
                                let name = await Attribute.findOne({ where: { id: attr.id } });
                                if (dishAttr && name) {
                                    totalAttributePrice += Number(dishAttr.price)
                                    let object = {
                                        "id": dishAttr.id,
                                        "name": name.name,
                                        "price": '$' + dishAttr.price
                                    }
                                    selectedAttribute.push(object);
                                }
                            }));
                        }
                        let orderDetailsObject = {
                            price: a.Dish.price,
                            totalPrice: (a.Dish.price + totalAttributePrice) * a.quantity,
                            attribute: selectedAttribute
                        }
                        await OrderDetails.update(orderDetailsObject, { where: { id: a.id } });
                    }
                }));

                if (removedDishCount == totalDishCount) {
                    await Order.destroy({ where: { id: orderId } });
                } else {
                    await this.inUpdateOrderInfo(orderId);
                }

                return resolve(true);
            } catch (error) {
                return reject(error);
            }
        });
    }

    async inUpdateOrderInfo(orderId) {
        return new Promise(async(resolve, reject) => {
            try {
                let orderData = await Order.findOne({
                    include: { model: OrderDetails },
                    where: { id: orderId }
                });

                let userCountry = orderData.addressCustomer.country.toLowerCase();
                let userState = orderData.addressCustomer.state.toLowerCase();
                let taxCountry = await CountriesSchema.findOne({ attributes: ['taxPercentage'], where: { countryName: sequelizeConnection.literal(`LOWER(countryName) = '${userCountry}'`),stateName: sequelizeConnection.literal(`LOWER(stateName) = '${userState}'`),status: true } });
                let taxPercentage = taxCountry ? taxCountry.taxPercentage : 0

                let totalItem = orderData.OrderDetails.length;
                let subTotal = orderData.OrderDetails.reduce((acc, a) => acc + a.totalPrice, 0);
                subTotal = Math.round(subTotal * 100) / 100;
                let taxAmount = Math.round(((subTotal / 100) * taxPercentage) * 100) / 100;
                let tipAmount = orderData.isPercentageTipStatus ? Math.round((subTotal / 100) * orderData.percentageTip) : orderData.tipAmount;
                let totalAmount = subTotal + taxAmount + tipAmount + orderData.deliveryAmount - orderData.discountAmount;
                totalAmount = Math.round(totalAmount * 100) / 100;
                // discountAmount
                let updateObject = { totalItem, subTotal, taxAmount, tipAmount, totalAmount };
                await orderData.update(updateObject);

                return resolve(true);
            } catch (error) {
                return reject(error);
            }
        });
    }

    /********************************************************
     Purpose: update Attribute
     Parameter:
     {
           "id":"id"
           "name": "blog 1",
            "displayName": "content",
            "description": "content",
     }
     Return: JSON String
     ********************************************************/
    async checkout() {
        try {

            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID });
            }



            let resultData = await Order.findOne({
                include: [{
                    model: OrderDetails,
                    attributes: ['id', 'price', 'quantity', 'attribute', 'totalPrice', 'dishId'],
                    include: { model: Dish, attributes: ['id', 'name', 'type', 'media', 'dishStatus', 'saleType', 'isPreOrderOnly', 'deletedAt'], paranoid: false }
                }, ],
                where: { id: this.req.body.id, userId: this.req.body.userId, orderStatus: 'Cart' }
            });
            if (_.isEmpty(resultData)) {
                return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });
            }

            //getting customer address details
            let addressDetails = await Address.findOne({ where: { userId: this.req.body.userId, primaryAddressStatus: true } });
            let searchLat = addressDetails.latitude
            let searchLng = addressDetails.longitude
            let distanceQuery = `ST_Distance_Sphere(addressPoint, point(${searchLng}, ${searchLat}) ) * .000621371192`;

            //checking distance customer and chef   
            let globalSettings = await SettingsSchema.findOne();
            let checkChefDetails = await Address.findOne({
                attributes: ['id', [sequelizeConnection.literal(distanceQuery), 'distance'], 'kitchenId'],
                having: {
                    distance: {
                        [Op.lt]: globalSettings.app_search_radius.driver_nearby
                    }
                },
                where: { userId: resultData.chefId }
            });

            if (checkChefDetails) {
                let jsonValue = resultData;
                console.log(jsonValue,'josn')
                // check dish remove, unpublish, normal, pre-order
                let removedDishes = [],
                    soldoutDishes = [],
                    normalDishes = [],
                    preOrderDishes = [];
                await Promise.all(resultData.OrderDetails.map(async(cartValue, key) => {
                    if (cartValue.Dish.deletedAt !== null || cartValue.Dish.dishStatus == 'Unpublish') {
                        removedDishes.push(cartValue.Dish.name);
                    } else if (cartValue.Dish.saleType == 'Sold Out') {
                        soldoutDishes.push(cartValue.Dish.name);
                    } else if (resultData.orderDishType == 'PreOrder' && !cartValue.Dish.isPreOrderOnly) {
                        normalDishes.push(cartValue.Dish.name);
                    } else if (resultData.orderDishType == 'Normal' && cartValue.Dish.isPreOrderOnly) {
                        preOrderDishes.push(cartValue.Dish.name);
                    } else {
                        let object = {
                            id: cartValue.Dish.id,
                            name: cartValue.Dish.name,
                            type: cartValue.Dish.type,
                            media: cartValue.Dish.getDataValue('media')
                        }
                        let objDetail = await OrderDetails.findOne({ where: { id: cartValue.id } });
                        await objDetail.update({ dishInfo: object });
                    }
                }));
                if (removedDishes.length) {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: `${removedDishes.slice(0,5).join(', ')} ${exportLib.ResponseEn.DISHES_NOT}` });
                }
                if (soldoutDishes.length) {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: `${soldoutDishes.slice(0,5).join(', ')} ${exportLib.ResponseEn.DISHES_SOLD}` });
                }
                if (normalDishes.length) {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: `${normalDishes.slice(0,5).join(', ')} ${exportLib.ResponseEn.DISHES_BE_NORMAL}` });
                }
                if (preOrderDishes.length) {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: `${preOrderDishes.slice(0,5).join(', ')} ${exportLib.ResponseEn.DISHES_BE_PRE}` });
                }

                // check if dish attr update
                checkChefDetails = checkChefDetails.toJSON();
                //console.log(checkChefDetails, 'checkdetails')
                if (resultData.orderType == 'Delivery') {
                    let addUpdate = {
                        distance: Math.round(checkChefDetails.distance * 100) / 100,
                        deliveryAmount: await this.getDeliveryFee(checkChefDetails.distance)
                    }
                    await Order.update(addUpdate, { where: { id: this.req.body.id } });
                }
                await this.inUpdateOrderDetailInfo(this.req.body.id);

                resultData = await Order.findOne({
                    include: [{
                        model: OrderDetails,
                        attributes: ['id', 'price', 'quantity', 'attribute', 'totalPrice', 'dishId'],
                        include: { model: Dish, attributes: ['id', 'name', 'type', 'media', 'dishStatus', 'saleType', 'isPreOrderOnly', 'deletedAt'] }
                    }, ],
                    where: { id: this.req.body.id, userId: this.req.body.userId, orderStatus: 'Cart' }
                });
                if (_.isEmpty(resultData)) {
                    return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });
                }
                jsonValue = resultData;


                //getting customer details
                let customerDetails = await Users.findOne({ where: { id: jsonValue.userId } })
                let customerObject = {
                    "photo": customerDetails.photo,
                    "id": customerDetails.id,
                    "firstName": customerDetails.firstName,
                    "lastName": customerDetails.lastName,
                    "emailId": customerDetails.emailId,
                    "totalRating": customerDetails.totalRating,
                    "avgRate": customerDetails.avgRate,
                    "isOnline": customerDetails.isOnline,
                    "countryCode": customerDetails.countryCode,
                    "mobile": customerDetails.mobile
                }

                //getting chef  details
                let chefDetails = await Users.findOne({ where: { id: resultData.chefId } })
                let chefObject = {
                    "photo": chefDetails.photo,
                    "id": chefDetails.id,
                    "firstName": chefDetails.firstName,
                    "lastName": chefDetails.lastName,
                    "emailId": chefDetails.emailId,
                    mobile: chefDetails.mobile,
                    countryCode: chefDetails.countryCode,
                    "totalRating": chefDetails.totalRating,
                    "avgRate": chefDetails.avgRate,
                    "isOnline": chefDetails.isOnline
                }


                //getting chef address details
                let addressDetailsChef = await Address.findOne({ where: { userId: jsonValue.chefId, primaryAddressStatus: true } });
                let addressChefObject = {
                    addressOne: addressDetailsChef.addressOne,
                    addressTwo: addressDetailsChef.addressTwo,
                    country: addressDetailsChef.country,
                    state: addressDetailsChef.state,
                    city: addressDetailsChef.city,
                    zipcode: addressDetailsChef.zipcode,
                    latitude: addressDetailsChef.latitude,
                    longitude: addressDetailsChef.longitude,
                }

                //getting customer address details
                let addressCustomerDetails = await Address.findOne({ where: { userId: jsonValue.userId, primaryAddressStatus: true } });
                let addressCustomerObject = {
                    firstName: addressCustomerDetails.firstName,
                    countryCode: addressCustomerDetails.countryCode,
                    mobile: addressCustomerDetails.mobile,
                    addressOne: addressCustomerDetails.addressOne,
                    addressTwo: addressCustomerDetails.addressTwo,
                    addressType: addressCustomerDetails.addressType,
                    country: addressCustomerDetails.country,
                    state: addressCustomerDetails.state,
                    city: addressCustomerDetails.city,
                    zipcode: addressCustomerDetails.zipcode,
                    latitude: addressCustomerDetails.latitude,
                    longitude: addressCustomerDetails.longitude,
                }




                let setObject = {};
                let dateTime
                if (jsonValue.orderDishType == 'PreOrder' && this.req.body.preOrderDate != '' && this.req.body.preOrderDate != undefined) {
                    dateTime = this.req.body.preOrderDate + ' ' + this.req.body.preOrderTime
                }

                //payment charges in with stripe
                let stripe = new Stripe();
                let paymentRequest = {
                    amount: Math.round(jsonValue.totalAmount * 100),
                    customerId: this.req.body.stripeCustomerId,
                    cardId: this.req.body.cardId
                }
                let creditCard = await stripe.payment(paymentRequest);
                // console.log(creditCard,'creditCard')

                // count chef earning for order
                let globalSettings = await SettingsSchema.findOne();
                let chefCommissionPercentage = chefDetails.isCommissionSet ? chefDetails.commissionPercentage : globalSettings.commission_food_order;
                let updateChefAmount = jsonValue.subTotal - (jsonValue.subTotal * chefCommissionPercentage / 100);
                updateChefAmount = Math.round(updateChefAmount * 100) / 100;
                //console.log(updateChefAmount,'chef amount dataTime')

                //check order is take way or delivery for tipAmount chef or Delivery partner 
                let tipamount = jsonValue.orderType == 'Take away' ? jsonValue.tipAmount : 0
                updateChefAmount = updateChefAmount + tipamount


                let isChefKitchen = await KitchenSchema.count({ where: { id: checkChefDetails.kitchenId, userId: jsonValue.chefId } })

                setObject = {
                        orderStatus: 'Pending',
                        remark: this.req.body.remark ? this.req.body.remark : '',
                        customerInfo: customerObject,
                        chefInfo: chefObject,
                        customerName: customerDetails.firstName + ' ' + customerDetails.lastName,
                        chefName: chefDetails.firstName + ' ' + chefDetails.lastName,
                        addressCustomer: addressCustomerObject,
                        addressChef: addressChefObject,
                        orderDate: dateTime ? new Date(dateTime) : jsonValue.orderDate,
                        paymentIntentId: creditCard.id,
                        stripeCustomerId: this.req.body.stripeCustomerId,
                        paymentIntentStatus: 'CustomerPay',
                        // tipAmount:tipAmount ?  Math.round(tipAmount) : jsonValue.tipAmount,
                        // totalAmount:totalAmount ? totalAmount : jsonValue.totalAmount,
                        chefAmount: updateChefAmount,
                        kitchenId: isChefKitchen ? checkChefDetails.kitchenId : null
                    }
                    // console.log(setObject,'dataTime')
                await Order.update(setObject, { where: { id: this.req.body.id } });

                let response = {
                    id: jsonValue.id,
                    orderUnique: jsonValue.orderUnique
                }

                exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: response });


                // sending push notification 
                let chefInfoDetails = await Users.findOne({ where: { id: jsonValue.chefId } })
                if (chefInfoDetails) {
                    let template = await NotificationTemplateSchema.findOne({ raw: true, where: { templateKey: 'order_new', status: true } });
                    if (!_.isEmpty(template)) {
                        let sendPushObject = {
                            payload: {
                                title: Mustache.render(template.title, { orderId: jsonValue.orderUnique }),
                                message: Mustache.render(template.message, { orderId: jsonValue.orderUnique }),
                                userType: 'Chef',
                                type: "order_new",
                                orderId: jsonValue.id,
                                userId: 'chef_' + jsonValue.chefId,
                                orderDishType: jsonValue.orderDishType
                            },
                            templateKey: 'order_new',
                            userId: jsonValue.chefId
                        }
                        await (new CommonService()).sendPushNotification(sendPushObject)
                    }

                    //sending socket notification for chef & getting order 
                    client.get(jsonValue.chefId, (err, socketId) => {
                        if (err) {
                            console.log("chef getting error ====>", err)
                        }
                        //console.log("socket io == > ",io)
                        let socketPush = {
                            title: template.title,
                            message: Mustache.render(template.message, { orderId: jsonValue.orderUnique }),
                            userType: 'Chef',
                            type: "order_new",
                            orderId: jsonValue.id,

                        }
                        console.log("before send socket id ===>", socketId);
                        io.to(socketId).emit('orderSendChef', socketPush);
                        //console.log("socket id ===>", socketId);
                    });



                }

            } else {
                return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.DISTANCE_CHEF_CHECK });
            }


        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
    Purpose: Listing data
    Parameter:
    {
        "page": 1,
        "pageSize": 10,
        "searchText": "",
        "sort": { id: 1 }
    }
    Return: JSON String
    ********************************************************/
    async getOrderList() {
            try {
                let currentUser = this.req.body.userId;
                let reqData = this.req.body;
                let perPage = 10;
                let skip = (reqData.page - 1) * (perPage);

                let whereCnd = {
                    userId: currentUser,
                    orderStatus: {
                        [Op.notIn]: ['Cart']
                    }
                };
                if (reqData.orderStatus) {
                    whereCnd.orderStatus = reqData.orderStatus;
                }

                let listData = await Order.findAndCountAll({
                    attributes: ['id', 'orderUnique', 'orderDate', 'orderStatus', 'subTotal', 'totalItem', 'ratedByCustomer'],
                    include: [{ model: Users, as: 'chef', attributes: ['id', 'firstName', 'lastName', 'photo', 'isOnline'], required: true }],
                    where: whereCnd,
                    offset: skip,
                    limit: perPage,
                    order: [
                        ['createdAt', 'DESC']
                    ]
                });
                if (_.isEmpty(listData)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }

                let lastPage = Math.ceil(listData.count / perPage);
                return exportLib.Response.handleListingResponseMinField(this.res, { code: 'SUCCESS', message: "", data: listData.rows, current_page: reqData.page, last_page: lastPage, per_page: perPage, total: listData.count });
            } catch (error) {
                console.log(error);
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
           Purpose: order detail
           Return: JSON String
           ********************************************************/
    async getOrderDetail() {
            try {

                let reqData = this.req.body;
                let resultData = await Order.findOne({
                    include: [
                        { model: OrderStatusTimeline, attributes: ['orderStatus', 'createdAt'] },
                        {
                            model: OrderDetails,
                            attributes: ['price', 'quantity', 'attribute', 'totalPrice', 'dishInfo']
                        },
                        //  { model: Users, as: 'driver', attributes: ['id', 'firstName', 'lastName', 'photo', 'countryCode', 'mobile'] },
                        // { model: Users, as: 'chef', attributes: ['id', 'firstName', 'lastName','photo','totalRating','avgRate','isOnline'] },
                    ],
                    where: { id: reqData.id }
                })
                if (_.isEmpty(resultData)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }

                let orderDetailsValue = resultData.toJSON();
                await Promise.all(orderDetailsValue.OrderDetails.map((cartValue, key) => {
                    orderDetailsValue.OrderDetails[key] = {
                        id: cartValue.dishInfo.id,
                        "price": "$" + ' ' + cartValue.price,
                        "quantity": cartValue.quantity,
                        "attribute": cartValue.attribute,
                        "totalPrice": "$" + ' ' + cartValue.totalPrice,
                        "dishName": cartValue.dishInfo.name,
                        "dishMedia": cartValue.dishInfo.media,
                        "dishType": cartValue.dishInfo.type
                    }


                }))

                // check favourite chef and dish
                let chefFavourite
                if (this.req.body.userId) {
                    chefFavourite = await Favourites.findOne({ where: { userId: this.req.body.userId, chefId: orderDetailsValue.chefId } })
                }

                let chefOnline = await Users.findOne({ where: { id: orderDetailsValue.chefId }, attributes: ['isOnline'] })
                let complementsTypes = await UserComplementsType.findAll({ attributes: ['id', 'name', 'image'] })

                let response = {
                    "id": orderDetailsValue.id,
                    "orderUnique": orderDetailsValue.orderUnique,
                    "subTotal": "$" + ' ' + orderDetailsValue.subTotal,
                    "taxAmount": "$" + ' ' + orderDetailsValue.taxAmount,
                    "discountAmount": "$" + ' ' + orderDetailsValue.discountAmount,
                    "promoCode": orderDetailsValue.promoCode,
                    "tipAmount": "$" + ' ' + orderDetailsValue.tipAmount,
                    "deliveryAmount": "$" + ' ' + orderDetailsValue.deliveryAmount,
                    "totalAmount": "$" + ' ' + orderDetailsValue.totalAmount,
                    "totalItem": orderDetailsValue.totalItem,
                    "remark": orderDetailsValue.remark,
                    "addressCustomer": orderDetailsValue.addressCustomer,
                    "distance": orderDetailsValue.distance,
                    "ratedByCustomer": orderDetailsValue.ratedByCustomer,
                    promoCodeApplyStatus: orderDetailsValue.promoCodeApplyStatus,
                    isPercentageTipStatus: orderDetailsValue.isPercentageTipStatus,
                    isCustomTipStatus: orderDetailsValue.isCustomTipStatus,
                    complements: complementsTypes,
                    "chef": {
                        "id": orderDetailsValue.chefInfo.id,
                        "photo": orderDetailsValue.chefInfo.photo,
                        "avgRate": orderDetailsValue.chefInfo.avgRate,
                        "isOnline": chefOnline ? chefOnline.isOnline : false,
                        mobile: orderDetailsValue.chefInfo.mobile,
                        countryCode: orderDetailsValue.chefInfo.countryCode,
                        "lastName": orderDetailsValue.chefInfo.lastName,
                        "firstName": orderDetailsValue.chefInfo.firstName,
                        "totalRating": orderDetailsValue.chefInfo.totalRating,
                        "isFavourite": chefFavourite ? true : false
                    },
                    "driver": {
                        "id": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.id ? orderDetailsValue.driverInfo.id : '',
                        "lastName": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.lastName ? orderDetailsValue.driverInfo.lastName : '',
                        "firstName": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.firstName ? orderDetailsValue.driverInfo.firstName : '',
                        vehicleModel: orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.vehicleModel ? orderDetailsValue.driverInfo.vehicleModel : '',
                        vehicleNumber: orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.vehicleNumber ? orderDetailsValue.driverInfo.vehicleNumber : '',
                        "photo": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.photo ? orderDetailsValue.driverInfo.photo : '',
                        "mobile": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.mobile ? orderDetailsValue.driverInfo.mobile : '',
                        "emailId": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.emailId ? orderDetailsValue.driverInfo.emailId : '',
                        "countryCode": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.countryCode ? orderDetailsValue.driverInfo.countryCode : '',
                        "addressOne": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.addressOne ? orderDetailsValue.driverInfo.addressOne : '',
                        "addressTwo": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.addressTwo ? orderDetailsValue.driverInfo.addressTwo : '',
                        "city": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.city ? orderDetailsValue.driverInfo.city : '',
                        "state": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.state ? orderDetailsValue.driverInfo.state : '',
                        "country": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.country ? orderDetailsValue.driverInfo.country : '',
                        "zipcode": orderDetailsValue.driverInfo && orderDetailsValue.driverInfo.zipcode ? orderDetailsValue.driverInfo.zipcode : ''
                    },
                    "addressChef": orderDetailsValue.addressChef,
                    "orderDate": orderDetailsValue.orderDate,
                    "orderType": orderDetailsValue.orderType,
                    "orderStatus": orderDetailsValue.orderStatus,
                    "orderDishType": orderDetailsValue.orderDishType,
                    "OrderStatusTimelines": orderDetailsValue.OrderStatusTimelines,
                    "OrderDetails": orderDetailsValue.OrderDetails
                }



                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS, data: response });
            } catch (error) {
                console.log(error);
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
            Purpose: order detail
            Return: JSON String
            ********************************************************/
    async getCartList() {
        try {
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let resultData = await Order.findOne({
                include: [{
                    model: OrderDetails,
                    attributes: ['dishId', 'quantity', 'attribute'],
                }],
                where: { userId: this.req.body.userId, orderStatus: 'Cart' }
            })
            let whereCnd = {
                    userId: this.req.body.userId,
                    orderStatus: {
                        [Op.notIn]: ['Cart', 'Delivered', 'Rejected', 'Cancelled', 'Delivered']
                    }
                }
                // console.log(resultData,'resultData')
                // console.log(resultData.OrderDetails,'orderDetails')
            let order = await Order.findAll({
                attributes: ['id', 'orderUnique', 'orderStatus'],
                where: whereCnd,
                limit: 1,
                order: [
                    ['createdAt', 'DESC']
                ]
            })
            if (_.isEmpty(resultData) && _.isEmpty(order)) {
                return exportLib.Response.handleListingBlankObjectResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
            }

            let responseCart = {
                cart: resultData && resultData.OrderDetails ? resultData.OrderDetails : [],
                order: order[0]
            }


            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS, data: responseCart });
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
         Purpose: update Attribute
         Parameter:
         {
               "id":"id"
               "name": "blog 1",
                "displayName": "content",
                "description": "content",
         }
         Return: JSON String
         ********************************************************/
    async cartUpdate() {
            try {

                if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID });
                }


                let resultData = await Order.findOne({
                    include: [{
                        model: OrderDetails,
                        attributes: ['id', 'price', 'quantity', 'attribute', 'totalPrice', 'dishId'],
                        include: [{ model: Dish, attributes: ['id', 'name', 'type', 'media'] }]
                    }, ],
                    where: { id: this.req.body.id, userId: this.req.body.userId, orderStatus: 'Cart' }
                })
                if (_.isEmpty(resultData)) {
                    return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });
                }

                let jsonValue = resultData.toJSON();
                //console.log(JSON.stringify(jsonValue),'jsonvalue')

                if (this.req.body.type == 'status') {
                    if (this.req.body.orderType == 'Delivery') {
                        //getting customer address details
                        let addressDetails = await Address.findOne({ where: { userId: this.req.body.userId, primaryAddressStatus: true } });
                        let searchLat = addressDetails.latitude
                        let searchLng = addressDetails.longitude
                        let distanceQuery = `ST_Distance_Sphere(addressPoint, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                        //checking distance customer and chef   
                        let checkChefDetails = await Address.findOne({
                            attributes: ['id', [sequelizeConnection.literal(distanceQuery), 'distance'], 'kitchenId'],
                            // having: { distance: { [Op.lt]: 14 } },
                            where: { userId: jsonValue.chefId }
                        });
                        checkChefDetails = checkChefDetails.toJSON();
                        let updatedeliveryAmount = await this.getDeliveryFee(checkChefDetails.distance);
                        let addUpdate = {
                            distance: Math.round(checkChefDetails.distance * 100) / 100,
                            deliveryAmount: updatedeliveryAmount,
                            totalAmount: jsonValue.totalAmount + updatedeliveryAmount,
                            orderType: this.req.body.orderType
                        }
                        await Order.update(addUpdate, { where: { id: this.req.body.id } });

                        let orderDetail = await Order.findOne({ where: { id: this.req.body.id } })
                        let responseOrder = {
                            subTotal: '$' + ' ' + (orderDetail.subTotal).toFixed(2),
                            taxAmount: '$' + ' ' + (orderDetail.taxAmount).toFixed(2),
                            discountAmount: '$' + ' ' + (orderDetail.discountAmount).toFixed(2),
                            tipAmount: '$' + ' ' + (orderDetail.tipAmount).toFixed(2),
                            deliveryAmount: '$' + ' ' + (orderDetail.deliveryAmount).toFixed(2),
                            totalAmount: '$' + ' ' + (orderDetail.totalAmount).toFixed(2),
                            promoCode: orderDetail.promoCode,
                            promoCodeApplyStatus: orderDetail.promoCodeApplyStatus,
                            customTipAmount: orderDetail.customTipAmount,
                            percentageTip: orderDetail.percentageTip,
                            isCustomTipStatus: orderDetail.isCustomTipStatus,
                            isPercentageTipStatus: orderDetail.isPercentageTipStatus
                        }

                        return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });

                    } else if (this.req.body.orderType == 'Take away') {
                        let totalAmount = Number(jsonValue.totalAmount) - jsonValue.deliveryAmount
                        let setObject = {};
                        setObject = {
                            orderType: this.req.body.orderType,
                            deliveryAmount: 0,
                            totalAmount: totalAmount
                        }

                        await Order.update(setObject, { where: { id: this.req.body.id } });
                        let orderTakeDetail = await Order.findOne({ where: { id: this.req.body.id } })
                        let responseOrder = {
                            orderType: orderTakeDetail.orderType,
                            subTotal: '$' + ' ' + (orderTakeDetail.subTotal).toFixed(2),
                            taxAmount: '$' + ' ' + (orderTakeDetail.taxAmount).toFixed(2),
                            discountAmount: '$' + ' ' + (orderTakeDetail.discountAmount).toFixed(2),
                            tipAmount: '$' + ' ' + (orderTakeDetail.tipAmount).toFixed(2),
                            deliveryAmount: '$' + ' ' + (orderTakeDetail.deliveryAmount).toFixed(2),
                            totalAmount: '$' + ' ' + (orderTakeDetail.totalAmount).toFixed(2),
                            promoCode: orderTakeDetail.promoCode,
                            promoCodeApplyStatus: orderTakeDetail.promoCodeApplyStatus,
                            customTipAmount: orderTakeDetail.customTipAmount,
                            percentageTip: orderTakeDetail.percentageTip,
                            isCustomTipStatus: orderTakeDetail.isCustomTipStatus,
                            isPercentageTipStatus: orderTakeDetail.isPercentageTipStatus
                        }

                        return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });

                    }

                } else if (this.req.body.type == 'quantity') {
                    // let dishId = await Dish.findOne({ where: { id:this.req.body.dishId }});
                    // if (_.isEmpty(dishId)) {
                    //     return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message:exportLib.ResponseEn.DISH_DELETED});
                    // }

                    let totalAttributePrice = 0
                    let qty
                    let totalDishPrice
                    let selectedAttribute = []
                    if (this.req.body.quantity != 0) {
                        await Promise.all(jsonValue.OrderDetails.map(async(attributes, key) => {
                            if (attributes.dishId == this.req.body.dishId) {
                                await Promise.all(attributes.attribute.map(async reqAttribute => {
                                    // let name = await Attribute.findOne({where:{id:reqAttribute.id},paranoid: false})
                                    // console.log(reqAttribute.price,'reqAttribute.price')
                                    totalAttributePrice += Number(reqAttribute.price.substring(1))
                                    let object = {
                                        "id": reqAttribute.id,
                                        "name": reqAttribute.name,
                                        "price": reqAttribute.price
                                    }
                                    selectedAttribute.push(object)
                                }))
                                qty = Number(this.req.body.quantity)
                                totalDishPrice = (attributes.price + totalAttributePrice) * qty;

                                let orderDetailsObject = {
                                    quantity: this.req.body.quantity,
                                    totalPrice: totalDishPrice
                                }
                                await OrderDetails.update(orderDetailsObject, { where: { id: attributes.id } });
                            }
                        }))
                        await this.inUpdateOrderInfo(this.req.body.id);

                        /* let orderDetailsCount = await OrderDetails.count({where:{orderId:this.req.body.id,userId:this.req.body.userId}});
                    
                    //calculation subtotal and totalAmount
                    let subtotalAmount
                    let totalAmount
                    let discountValue
                    let promoCodeApplyStatus
                    if(orderDetailsCount != 1)
                    {
                                let orderSubTotal = await OrderDetails.findOne({
                                    attributes: [[Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'subTotal']],
                                    where: { orderId: this.req.body.id },
                                    raw: true
                                });
                                subtotalAmount =  orderSubTotal.subTotal
                                totalAmount = orderSubTotal.subTotal + jsonValue.taxAmount + jsonValue.deliveryAmount + jsonValue.tipAmount  - jsonValue.discountAmount               

                    }
                    else if(orderDetailsCount == 1)
                    {
                        if(totalDishPrice < jsonValue.discountAmount)
                        {
                            subtotalAmount =  totalDishPrice
                            discountValue = 0
                            promoCodeApplyStatus = false
                            totalAmount = jsonValue.taxAmount + jsonValue.deliveryAmount + jsonValue.tipAmount + totalDishPrice              
                     
                        }
                        else
                        {
                            subtotalAmount =  totalDishPrice
                            totalAmount = jsonValue.taxAmount + jsonValue.deliveryAmount + jsonValue.tipAmount + totalDishPrice - jsonValue.discountAmount               
                        }    

                    }
                    //console.log(discountValue,'discountValue')
                    //console.log(promoCodeApplyStatus,'promoCodeApplyStatus')
                  
                        let updateOrder= {
                            subTotal: subtotalAmount,
                            discountAmount:discountValue == 0 ? discountValue : jsonValue.discountValue,
                            promoCode:discountValue == 0 ? '' : jsonValue.promocode,
                            promoCodeApplyStatus:promoCodeApplyStatus,
                            totalAmount: totalAmount,
                        }
                      //  console.log(updateOrder,'updateOrder')
                        await Order.update(updateOrder,{where:{id:this.req.body.id}}); */

                        //set response for cart
                        let orderDetail = await Order.findOne({ where: { id: this.req.body.id } })
                        let responseOrder = {
                            id: orderDetail.id,
                            subTotal: '$' + ' ' + (orderDetail.subTotal).toFixed(2),
                            taxAmount: '$' + ' ' + (orderDetail.taxAmount).toFixed(2),
                            discountAmount: '$' + ' ' + (orderDetail.discountAmount).toFixed(2),
                            tipAmount: '$' + ' ' + (orderDetail.tipAmount).toFixed(2),
                            deliveryAmount: '$' + ' ' + (orderDetail.deliveryAmount).toFixed(2),
                            totalAmount: '$' + ' ' + (orderDetail.totalAmount).toFixed(2),
                            quantity: this.req.body.quantity,
                            promoCode: orderDetail.promoCode,
                            promoCodeApplyStatus: orderDetail.promoCodeApplyStatus,
                            customTipAmount: orderDetail.customTipAmount,
                            percentageTip: orderDetail.percentageTip,
                            isCustomTipStatus: orderDetail.isCustomTipStatus,
                            isPercentageTipStatus: orderDetail.isPercentageTipStatus
                        }

                        return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });
                    } else if (this.req.body.quantity == 0) {
                        let orderDetailsCount = await OrderDetails.count({ where: { orderId: this.req.body.id, userId: this.req.body.userId } });
                        if (orderDetailsCount != 1) {


                            //getting dish details 
                            let dishInfoId = await OrderDetails.findOne({ where: { dishId: this.req.body.dishId, orderId: this.req.body.id, userId: this.req.body.userId } });
                            await OrderDetails.destroy({ where: { dishId: this.req.body.dishId, orderId: this.req.body.id, userId: this.req.body.userId } });
                            await this.inUpdateOrderInfo(this.req.body.id);
                            //console.log(dishId,'dishId')
                            //calculation subtotal and totalAmount
                            /* let subtotalAmount = jsonValue.subTotal - dishInfoId.totalPrice
                             let totalAmount = jsonValue.totalAmount - dishInfoId.totalPrice
                             let totalItemCount = await OrderDetails.findAll({where:{orderId:this.req.body.id}})
    
                             let updateOrder= {
                                 subTotal: subtotalAmount,
                                 totalAmount: totalAmount,
                                 totalItem: totalItemCount.length,
                             }
                             await Order.update(updateOrder,{where:{id:this.req.body.id}}); */

                            //set response for cart
                            let orderDetail = await Order.findOne({ where: { id: this.req.body.id } })
                            let responseOrder = {
                                id: orderDetail.id,
                                subTotal: '$' + ' ' + (orderDetail.subTotal).toFixed(2),
                                taxAmount: '$' + ' ' + (orderDetail.taxAmount).toFixed(2),
                                discountAmount: '$' + ' ' + (orderDetail.discountAmount).toFixed(2),
                                tipAmount: '$' + ' ' + (orderDetail.tipAmount).toFixed(2),
                                deliveryAmount: '$' + ' ' + (orderDetail.deliveryAmount).toFixed(2),
                                totalAmount: '$' + ' ' + (orderDetail.totalAmount).toFixed(2),
                                quantity: this.req.body.quantity,
                                promoCode: orderDetail.promoCode,
                                promoCodeApplyStatus: orderDetail.promoCodeApplyStatus,
                                customTipAmount: orderDetail.customTipAmount,
                                percentageTip: orderDetail.percentageTip,
                                isCustomTipStatus: orderDetail.isCustomTipStatus,
                                isPercentageTipStatus: orderDetail.isPercentageTipStatus
                            }

                            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });

                        } else if (orderDetailsCount == 1) {

                            await Order.destroy({ where: { id: this.req.body.id } });
                            await OrderDetails.destroy({ where: { orderId: this.req.body.id } });

                            return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.CART_NO_RECORD });

                        }
                    }


                } else if (this.req.body.type == 'tip') {
                    //calculation tip value
                    let totalAmount
                    let tipAmount
                    let setObject = {};
                    if (this.req.body.customTipAmount != '' && this.req.body.customTipAmount != undefined) {
                        tipAmount = (this.req.body.customTipAmount * 100) / 100
                        totalAmount = jsonValue.subTotal + tipAmount + jsonValue.taxAmount + jsonValue.deliveryAmount - jsonValue.discountAmount
                        setObject.customTipAmount = this.req.body.customTipAmount
                        setObject.percentageTip = 0
                        setObject.isCustomTipStatus = true
                        setObject.isPercentageTipStatus = false
                    } else if (this.req.body.percentageTip != '' && this.req.body.percentageTip != undefined) {
                        let removeDecimal = (Number(jsonValue.subTotal) * Number(this.req.body.percentageTip) / 100)
                        tipAmount = removeDecimal
                        totalAmount = jsonValue.subTotal + tipAmount + jsonValue.taxAmount + jsonValue.deliveryAmount - jsonValue.discountAmount
                        setObject.percentageTip = this.req.body.percentageTip
                        setObject.customTipAmount = 0
                        setObject.isPercentageTipStatus = true
                        setObject.isCustomTipStatus = false
                    } else {
                        tipAmount = 0
                        totalAmount = jsonValue.totalAmount - jsonValue.tipAmount
                        setObject.customTipAmount = 0
                        setObject.percentageTip = 0
                        setObject.isCustomTipStatus = false
                        setObject.isPercentageTipStatus = false
                    }




                    setObject.tipAmount = tipAmount
                    setObject.totalAmount = totalAmount

                    await Order.update(setObject, { where: { id: this.req.body.id } });

                    //set response for cart
                    let orderTipDetail = await Order.findOne({ where: { id: this.req.body.id } })

                    let responseOrder = {
                        id: orderTipDetail.id,
                        subTotal: '$' + ' ' + (orderTipDetail.subTotal).toFixed(2),
                        taxAmount: '$' + ' ' + (orderTipDetail.taxAmount).toFixed(2),
                        discountAmount: '$' + ' ' + (orderTipDetail.discountAmount).toFixed(2),
                        tipAmount: '$' + ' ' + (orderTipDetail.tipAmount).toFixed(2),
                        deliveryAmount: '$' + ' ' + (orderTipDetail.deliveryAmount).toFixed(2),
                        totalAmount: '$' + ' ' + (orderTipDetail.totalAmount).toFixed(2),
                        promoCode: orderTipDetail.promoCode,
                        promoCodeApplyStatus: orderTipDetail.promoCodeApplyStatus,
                        customTipAmount: orderTipDetail.customTipAmount,
                        percentageTip: orderTipDetail.percentageTip,
                        isCustomTipStatus: orderTipDetail.isCustomTipStatus,
                        isPercentageTipStatus: orderTipDetail.isPercentageTipStatus
                    }

                    return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });


                } else if (this.req.body.type == 'promocode') {
                    if (this.req.body.promocode != '' && this.req.body.promocode != undefined) {

                        let checkChefCouponValid = await Coupon.findOne({
                            where: {
                                [Op.or]: [{ 'couponCode': this.req.body.promocode }, { 'isForAllChef': true }]
                            }
                        })
                        if (checkChefCouponValid) {
                            let todayDate = moment().format('YYYY-MM-DD');
                            let checkChefCoupon = await Coupon.findOne({
                                where: {
                                    [Op.or]: [{ 'couponCode': this.req.body.promocode }, { 'isForAllChef': true }],
                                    fromDate: sequelizeConnection.literal(`DATE(fromDate) <= '${todayDate}'`),
                                    toDate: sequelizeConnection.literal(`DATE(toDate) >= '${todayDate}'`)
                                }
                            })
                            if (checkChefCoupon) {
                                //calculation promo code value
                                let discountAmounts
                                let totalAmount


                                if (checkChefCoupon.discountType == 'Flat') {
                                    if (Number(jsonValue.totalAmount) > Number(checkChefCoupon.discount)) {
                                        discountAmounts = checkChefCoupon.discount
                                        totalAmount = jsonValue.totalAmount - discountAmounts
                                    } else {
                                        return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.PROMO_CODE_CHECK });
                                    }

                                } else if (checkChefCoupon.discountType == 'Percentage') {
                                    discountAmounts = (Number(jsonValue.subTotal) * Number(checkChefCoupon.discount) / 100)
                                    if (Number(jsonValue.totalAmount) > Math.round(discountAmounts)) {
                                        //discountAmounts = discountAmounts
                                        totalAmount = jsonValue.totalAmount - Math.round(discountAmounts)
                                    } else {
                                        return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.PROMO_CODE_CHECK });
                                    }


                                }

                                let setObject = {};
                                setObject = {
                                    discountAmount: Math.round(discountAmounts),
                                    totalAmount: totalAmount,
                                    promoCode: this.req.body.promocode,
                                    promoCodeApplyStatus: true,
                                }
                                await Order.update(setObject, { where: { id: this.req.body.id } });

                                //set response for cart
                                let orderPromoCodeDetail = await Order.findOne({ where: { id: this.req.body.id } })
                                let responseOrder = {
                                    id: orderPromoCodeDetail.id,
                                    subTotal: '$' + ' ' + (orderPromoCodeDetail.subTotal).toFixed(2),
                                    taxAmount: '$' + ' ' + (orderPromoCodeDetail.taxAmount).toFixed(2),
                                    discountAmount: '$' + ' ' + (orderPromoCodeDetail.discountAmount).toFixed(2),
                                    tipAmount: '$' + ' ' + (orderPromoCodeDetail.tipAmount).toFixed(2),
                                    deliveryAmount: '$' + ' ' + (orderPromoCodeDetail.deliveryAmount).toFixed(2),
                                    totalAmount: '$' + ' ' + (orderPromoCodeDetail.totalAmount).toFixed(2),
                                    promoCode: orderPromoCodeDetail.promoCode,
                                    promoCodeApplyStatus: orderPromoCodeDetail.promoCodeApplyStatus,
                                    customTipAmount: orderPromoCodeDetail.customTipAmount,
                                    percentageTip: orderPromoCodeDetail.percentageTip,
                                    isCustomTipStatus: orderPromoCodeDetail.isCustomTipStatus,
                                    isPercentageTipStatus: orderPromoCodeDetail.isPercentageTipStatus
                                }

                                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });
                            } else {
                                return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.EXPIRE_PROMO_CODE });
                            }
                        } else {
                            return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.PROMO_CODE_VALID });
                        }
                    } else {
                        let totalAmount = jsonValue.totalAmount + jsonValue.discountAmount
                        let setObject = {};
                        setObject = {
                            discountAmount: 0,
                            totalAmount: totalAmount,
                            promoCode: '',
                            promoCodeApplyStatus: false,
                        }

                        await Order.update(setObject, { where: { id: this.req.body.id } });

                        //set response for cart
                        let orderPromoCodeDetail = await Order.findOne({ where: { id: this.req.body.id } })
                        let responseOrder = {
                            id: orderPromoCodeDetail.id,
                            subTotal: '$' + ' ' + (orderPromoCodeDetail.subTotal).toFixed(2),
                            taxAmount: '$' + ' ' + (orderPromoCodeDetail.taxAmount).toFixed(2),
                            discountAmount: '$' + ' ' + (orderPromoCodeDetail.discountAmount).toFixed(2),
                            tipAmount: '$' + ' ' + (orderPromoCodeDetail.tipAmount).toFixed(2),
                            deliveryAmount: '$' + ' ' + (orderPromoCodeDetail.deliveryAmount).toFixed(2),
                            totalAmount: '$' + ' ' + (orderPromoCodeDetail.totalAmount).toFixed(2),
                            promoCode: orderPromoCodeDetail.promoCode,
                            promoCodeApplyStatus: orderPromoCodeDetail.promoCodeApplyStatus,
                            customTipAmount: orderPromoCodeDetail.customTipAmount,
                            percentageTip: orderPromoCodeDetail.percentageTip,
                            isCustomTipStatus: orderPromoCodeDetail.isCustomTipStatus,
                            isPercentageTipStatus: orderPromoCodeDetail.isPercentageTipStatus
                        }

                        return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS, data: responseOrder });

                    }
                }

            } catch (error) {
                console.log(error);
                return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
            }
        }
        /********************************************************
        Purpose: re order
        Parameter:
        {
               "userId":1,
               "dishId": 1,
        }
        Return: JSON String
        ********************************************************/
    async reorder() {
            try {

                if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
                }




                let resultData = await Order.findOne({
                    include: [{
                        model: OrderDetails,
                        attributes: ['id', 'price', 'quantity', 'attribute', 'totalPrice', 'dishId', 'dishInfo'],
                        include: [{ model: Dish, attributes: ['id', 'name', 'price', 'type', 'media', 'isPreOrderOnly'] }]
                    }, ],
                    where: { id: this.req.body.orderId, userId: this.req.body.userId }
                })
                if (_.isEmpty(resultData) || _.isEmpty(resultData.OrderDetails)) {
                    return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.NO_ORDER_DETAIL });
                }


                let jsonValue = resultData;
                //console.log(jsonValue ,'jsonValue')
                //getting customer address details
                let addressDetails = await Address.findOne({ where: { userId: this.req.body.userId, primaryAddressStatus: true } });
                let searchLat = addressDetails.latitude
                let searchLng = addressDetails.longitude
                let distanceQuery = `ST_Distance_Sphere(addressPoint, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                //checking distance customer and chef   
                let chefDetails = await Address.findOne({
                    attributes: ['id', [sequelizeConnection.literal(distanceQuery), 'distance']],
                    having: {
                        distance: {
                            [Op.lt]: 14
                        }
                    },
                    where: { userId: jsonValue.chefId }
                });

                if (chefDetails) {
                    chefDetails = chefDetails.toJSON();

                    //getting order 
                    let isCart = await Order.findOne({ attributes: ['id'], where: { userId: this.req.body.userId, orderStatus: 'Cart' } });
                    if (!_.isEmpty(isCart)) {
                        await isCart.destroy();
                        await OrderDetails.destroy({ where: { orderId: isCart.id } });
                    }

                    //getting customer address details
                    let addressCustomerInfo = await Address.findOne({ where: { userId: this.req.body.userId, primaryAddressStatus: true } });
                    let addressCustomerObject = {
                        addressOne: addressCustomerInfo.addressOne,
                        addressTwo: addressCustomerInfo.addressTwo,
                        addressType: addressCustomerInfo.addressType,
                        country: addressCustomerInfo.country,
                        state: addressCustomerInfo.state,
                        city: addressCustomerInfo.city,
                        zipcode: addressCustomerInfo.zipcode
                    }

                    //random number generated 
                    let randomNumber = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                    let setObject = {
                        chefId: jsonValue.chefId,
                        userId: this.req.body.userId,
                        orderUnique:  'FJFO' + randomNumber,
                        subTotal: 0,
                        taxAmount: 0,
                        discountAmount: 0,
                        tipAmount: 0,
                        distance: Math.round(chefDetails.distance * 100) / 100,
                        deliveryAmount: await this.getDeliveryFee(chefDetails.distance),
                        totalAmount: 0,
                        totalItem: 0,
                        orderStatus: 'Cart',
                        orderDishType: jsonValue.orderDishType,
                        // orderDishType: dishId.isPreOrderOnly == true ? 'PreOrder' : 'Normal',
                        orderDate: new Date(),
                        addressCustomer: addressCustomerObject,
                        //addressChef: addressChefObject,
                    }

                    let orderId = await Order.create(setObject);
                    let addedDish = 0;
                    // await Promise.all(jsonValue.OrderDetails.map(async (orderDetail,key) => {
                    for (let index = 0; index < jsonValue.OrderDetails.length; index++) {
                        let orderDetail = jsonValue.OrderDetails[index];

                        let dishId = await Dish.findOne({ where: { id: orderDetail.dishId } });
                        if (!_.isEmpty(dishId) && dishId.dishStatus == 'Publish' && dishId.saleType == 'Selling') {
                            if ((jsonValue.orderDishType == 'PreOrder' && dishId.isPreOrderOnly) || (jsonValue.orderDishType != 'PreOrder' && !dishId.isPreOrderOnly)) {
                                if (jsonValue.orderDishType != 'PreOrder' || (jsonValue.orderDishType == 'PreOrder' && addedDish < 1)) {
                                    let totalAttributePrice = 0
                                    let qty
                                    let totalDishPrice
                                    let selectedAttribute = []
                                    let requestAttribute = orderDetail.attribute ? await Promise.all(orderDetail.attribute.map(oldA => oldA.id)) : []
                                    if (dishId.attribute && requestAttribute.length != 0) {
                                        await Promise.all(dishId.attribute.map(async(attributes, key) => {
                                            let name = await Attribute.findOne({ where: { id: attributes.id } })
                                            if (!(attributes.isSelected === false) && !_.isEmpty(name)) {
                                                await Promise.all(requestAttribute.map(reqAttribute => {
                                                    if (reqAttribute == attributes.id) {
                                                        totalAttributePrice += Number(attributes.price)
                                                        let object = {
                                                            "id": attributes.id,
                                                            "name": name.name,
                                                            "price": '$' + attributes.price
                                                        }
                                                        selectedAttribute.push(object)
                                                    }
                                                }))
                                            }
                                        }))
                                        qty = Number(orderDetail.quantity)
                                        totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                    } else {
                                        qty = Number(orderDetail.quantity)
                                        totalDishPrice = (dishId.price + totalAttributePrice) * qty
                                    }

                                    let orderDetailsObject = {
                                        price: dishId.price,
                                        quantity: orderDetail.quantity,
                                        totalPrice: totalDishPrice,
                                        attribute: selectedAttribute.length != 0 ? selectedAttribute : [],
                                        dishId: dishId.id,
                                        orderId: orderId.id,
                                        userId: this.req.body.userId,
                                    }
                                    await OrderDetails.create(orderDetailsObject);
                                    addedDish++;
                                }
                            }
                        }
                    }
                    // }))

                    if (addedDish > 0) {
                        await this.inUpdateOrderInfo(orderId.id);

                        return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ADD_TO_CART });
                    } else {
                        return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.NO_REORDER });
                    }
                } else {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.DISTANCE_CHEF_CHECK });
                }
            } catch (error) {
                console.log(error);
                return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
            }
        }
        /********************************************************
        Purpose: chef rating api
        Return: JSON String
        ********************************************************/
    async ratingUser() {
        try {
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            //chef rating 
            if (this.req.body.chefId) {
                let setChefRequest = {
                    rating: this.req.body.chefRating,
                    complements: this.req.body.compliments,
                    userId: this.req.body.userId,
                    partnerId: this.req.body.chefId,
                    orderId: this.req.body.orderId
                }
                await RatingUser.create(setChefRequest);
            }

            //deriver rating
            if (this.req.body.driverId) {
                let setDriverRequest = {
                    rating: this.req.body.driverRating,
                    userId: this.req.body.userId,
                    comment: this.req.body.driverComment,
                    partnerId: this.req.body.driverId,
                    orderId: this.req.body.orderId
                }
                await RatingUser.create(setDriverRequest);
            }

            if (this.req.body.dish) {
                this.req.body.dish.map(async dishRating => {
                    let setDishRequest = {
                        dishId: dishRating.dishId,
                        rating: dishRating.rating,
                        comments: dishRating.comments,
                        userId: this.req.body.userId,
                        orderId: this.req.body.orderId
                    }
                    await RatingDish.create(setDishRequest);
                })
            }

            let requestOrder = {
                ratedByCustomer: true
            }
            await Order.update(requestOrder, { where: { id: this.req.body.orderId } })

            return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.RATING_SUCCESS });
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
    Purpose: chef rating api
    Return: JSON String
    ********************************************************/
    async addCreditCart() {
            try {
                if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
                }
                let userDetails = await Users.findOne({ attributes: ["stripeCustomerId"], where: { id: this.req.body.userId } })


                let requestCreditCard = {
                    creditCardNumber: this.req.body.creditCardNumber,
                    expMonth: this.req.body.expMonth,
                    expYear: this.req.body.expYear,
                    name: this.req.body.name,
                    cvc: this.req.body.cvc,
                    stripeCustomerId: userDetails.stripeCustomerId,
                }
                let stripe = await new Stripe()
                await stripe.addCard(requestCreditCard)

                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SAVE_CREDIT_CARD_SUCCESS });
            } catch (error) {
                console.log(error);
                return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
            }
        }
        /********************************************************
        Purpose: getting credit card information
        Return: JSON String
        ********************************************************/
    async getCreditCard() {
            try {
                if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
                }
                let userDetails = await Users.findOne({ attributes: ["stripeCustomerId"], where: { id: this.req.body.userId } })

                let stripe = new Stripe()
                let requestCreditCard = {
                    stripeCustomerId: userDetails.stripeCustomerId,
                }
                let creditCard = await stripe.getCard(requestCreditCard)
                let cardList = []
                creditCard.data.map(card => {
                    let setCard = {
                        cardId: card.id,
                        "brand": card.brand,
                        "exp_month": card.exp_month,
                        "exp_year": card.exp_year,
                        name: card.name,
                        "last4": card.last4
                    }
                    cardList.push(setCard)
                })


                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SAVE_CREDIT_CARD_SUCCESS, data: cardList });
            } catch (error) {
                console.log(error);
                return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
            }
        }
        /********************************************************
    Purpose: save credit card for user and create customer for stripe
    Parameter:
    {
         
	    "userId":"5ba4b9d4792616084a8cae60",
	    "cardId":"card_1DH9DKL1vn3KL9lxupeJaaqJ"

    }
    Return: JSON String
    ********************************************************/
    async updateCreditCardDefault() {
        try {

            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            let userDetails = await Users.findOne({ attributes: ["stripeCustomerId"], where: { id: this.req.body.userId } })

            let stripe = new Stripe()
            let requestCreditCard = {
                stripeCustomerId: userDetails.stripeCustomerId,
                cardId: this.req.body.cardId
            }
            await stripe.updateCreditCardStatus(requestCreditCard)
            return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.UPDATE_CREDIT_CARD_SUCCESS });

        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
        }

    }

    /********************************************************
        Purpose: save credit card for user and create customer for stripe
        Parameter:
        {
             
    	    "userId":"5ba4b9d4792616084a8cae60",
    	    "cardId":"card_1DH9DKL1vn3KL9lxupeJaaqJ"

        }
        Return: JSON String
        ********************************************************/
    async deleteCreditCard() {
        try {

            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            let userDetails = await Users.findOne({ attributes: ["stripeCustomerId"], where: { id: this.req.body.userId } })

            let stripe = new Stripe()
            let requestCreditCard = {
                stripeCustomerId: userDetails.stripeCustomerId,
                cardId: this.req.body.cardId
            }
            await stripe.deleteCreditCard(requestCreditCard)
            return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.DELETE_CREDIT_CARD_SUCCESS });

        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
        }

    }

    async getDeliveryFee(distance) {
        return new Promise(async(resolve, reject) => {
            try {
                if (distance <= 0) {
                    return resolve(0);
                }

                let settings = await SettingsSchema.findOne({ attributes: ['delivery_fees'] });

                let uniArr = [];
                let deliveryFees = settings.delivery_fees.filter(el => {
                    if (!uniArr.includes(el.distance)) {
                        uniArr.push(el.distance);
                        return true;
                    } else {
                        return false;
                    }
                });
                //console.log(deliveryFees, 'deliveryFees')
                deliveryFees.sort((a, b) => b.distance - a.distance);

                let currentValue
                let finalValue
                    //distance = 10
                    // console.log(distance, 'distance')
                    // console.log(deliveryFees, 'delivery fees')
                if (Math.round(distance) >= deliveryFees[0].distance) {
                    finalValue = deliveryFees[0].distance
                } else if (Math.round(distance) <= deliveryFees[deliveryFees.length - 1].distance) {
                    finalValue = deliveryFees[deliveryFees.length - 1].distance
                }
                if (!finalValue) {
                    deliveryFees.map(result => {
                        if (currentValue) {
                            if (Math.round(distance) <= currentValue) {
                                if (Math.round(distance) >= result.distance) {
                                    finalValue = currentValue
                                } else {
                                    currentValue = result.distance
                                }
                            }
                        } else {
                            if (Math.round(distance) <= result.distance) {
                                currentValue = result.distance
                            }
                        }
                    })
                }

                let feeObj = deliveryFees.find(a => a.distance == finalValue);
                let amount = 0;
                // console.log(finalValue, 'finalvalue')
                // console.log(feeObj, 'feeObj')
                if (feeObj) {
                    //amount = Math.round(feeObj.fee * distance * 100) / 100;
                    amount = feeObj.fee;
                }
                //console.log(amount, 'amount')
                return resolve(amount);
            } catch (error) {
                return reject(error);
            }
        });
    }

}
module.exports = OrderController;