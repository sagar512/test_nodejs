//const { validate } = require("./Validator");

module.exports = (app, express) => {

    const router = express.Router();

    //const Globals = require("../../../configs/Globals");
    const CMSController = require('../Cms/Controller');
    const config = require('../../../configs/configs');
   // const Validators = require("./Validator");

    router.post('/getFaq', (req, res, next) => {
        const addressObj = (new CMSController()).boot(req, res, next);
        return addressObj.getFaq();
    });

    router.post('/getCmsPage', (req, res, next) => {
        const addressObj = (new CMSController()).boot(req, res, next);
        return addressObj.getCmsPage();
    });
    router.post('/addContactUs', (req, res, next) => {
        const addressObj = (new CMSController()).boot(req, res, next);
        return addressObj.addContactUs();
    });


    app.use(config.baseApiUrl, router);
}