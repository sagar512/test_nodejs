module.exports = (app, express) => {

    const router = express.Router();

    const Globals = require("../../../configs/Globals");
    const OrderController = require('./Controller');
    const config = require('../../../configs/configs');


    router.post('/addToCart',Globals.isAuthorized,(req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.addToCart();
    });

    router.post('/cartDetails',Globals.isAuthorized ,(req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.cartDetails();
    });

    router.post('/getOrderList',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.getOrderList();
    });

    router.post('/orderDetails',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.getOrderDetail();
    });


    router.post('/getCartList',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.getCartList();
    });

    router.post('/checkout',(req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.checkout();
    });

    router.post('/cartUpdate',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.cartUpdate();
    });

    router.post('/reorder',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.reorder();
    });

    router.post('/ratingUser',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.ratingUser();
    });

    router.post('/addCreditCard',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.addCreditCart();
    });

    router.post('/getCreditCard',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.getCreditCard();
    });

    router.post('/updateCreditCardDefault',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.updateCreditCardDefault();
    });

    router.post('/deleteCreditCard',Globals.isAuthorized, (req, res, next) => {
        const obj = (new OrderController()).boot(req, res);
        return obj.deleteCreditCard();
    });

    app.use(config.baseApiUrl, router);
}
