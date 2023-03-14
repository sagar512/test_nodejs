module.exports = (app, express) => {

    const router = express.Router();

    const Globals = require("../../../configs/Globals");
    const Controller = require('./Controller');
    const config = require('../../../configs/configs');
    const Validators = require("./Validator");

    router.post('/getNotificationList', Globals.isAuthorized, Validators.listingValidator(), Validators.validate, (req, res, next) => {
        const obj = (new Controller()).boot(req, res);
        return obj.getNotificationList();
    });

    app.use(config.baseApiUrl, router);
}