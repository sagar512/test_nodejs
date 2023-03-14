//const { validate } = require("./Validator");

module.exports = (app, express) => {

    const router = express.Router();

    const Globals = require("../../../configs/Globals");
    const ReportController = require('../Report/Controller');
    const config = require('../../../configs/configs');
   // const Validators = require("./Validator");

    router.post('/addReport',Globals.isAuthorized, (req, res, next) => {
        const addressObj = (new ReportController()).boot(req, res, next);
        return addressObj.addReport();
    });


    app.use(config.baseApiUrl, router);
}