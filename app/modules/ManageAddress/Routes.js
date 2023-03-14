const { validate } = require("./Validator");

module.exports = (app, express) => {

    const router = express.Router();

    const Globals = require("../../../configs/Globals");
    const AddressController = require('../ManageAddress/Controller');
    const config = require('../../../configs/configs');
   // const Validators = require("./Validator");

    router.post('/addAddress',Globals.isAuthorized, (req, res, next) => {
        const addressObj = (new AddressController()).boot(req, res, next);
        return addressObj.addAddress();
    });

    router.post('/updateAddress',Globals.isAuthorized, (req, res, next) => {
        const addressObj = (new AddressController()).boot(req, res, next);
        return addressObj.updateAddress();
    });

    router.post('/updateAddressStatus',Globals.isAuthorized, (req, res, next) => {
        const addressObj = (new AddressController()).boot(req, res, next);
        return addressObj.updateAddressStatus();
    });

    router.post('/addressList',Globals.isAuthorized, (req, res, next) => {
        const addressObj = (new AddressController()).boot(req, res, next);
        return addressObj.addressList();
    });

    router.post('/deleteAddress',Globals.isAuthorized, (req, res, next) => {
        const attributeObj = (new AddressController()).boot(req, res, next);
        return attributeObj.deleteAddress();
    });

    router.post('/setPrimaryAddress',Globals.isAuthorized, (req, res, next) => {
        const attributeObj = (new AddressController()).boot(req, res, next);
        return attributeObj.updateAddressStatus();
    });

    router.post('/getPrimaryAddress',Globals.isAuthorized, (req, res, next) => {
        const attributeObj = (new AddressController()).boot(req, res, next);
        return attributeObj.getPrimaryAddress();
    });
  
    
   
    app.use(config.baseApiUrl, router);
}