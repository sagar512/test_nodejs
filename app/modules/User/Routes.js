
module.exports = (app, express) => {

    const router = express.Router();

    const Globals = require("../../../configs/Globals");
    const UsersController = require('../User/Controller');
    const config = require('../../../configs/configs');
    const Validators = require("./Validator");

    const multer = require('multer')
    , inMemoryStorage = multer.memoryStorage()
    , uploadStrategy = multer({ storage: inMemoryStorage }).single('photo')
    

    router.post('/users/register', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.register();
    });

    // router.post('/users/registerNew', (req, res, next) => {
    //     const userObj = (new UsersController()).boot(req, res);
    //     return userObj.registerNew();
    // });

    router.post('/users/forgotPassword', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.forgotPassword();
    });
    router.post('/users/resetPassword', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.resetPassword();
    });

    router.post('/users/login', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.login();
    });

    router.post('/users/changePassword', Globals.isAuthorized,(req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.changePassword();
    });

    router.post('/users/updateUserProfile',Globals.isAuthorized, uploadStrategy,(req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.editUserProfile();
    });

    router.get('/users/profile', Globals.isAuthorized, (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.userProfile();
    });

    router.get('/users/verifyUser', Validators.verifyUserValidator(), Validators.validate, (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.verifyUser();
    });
    router.get('/users/logout', Globals.isAuthorized, (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.logout();
    });
    router.get('/users/refreshAccessToken', Globals.isValid, (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.refreshAccessToken();
    });
    router.post('/users/fileUpload',uploadStrategy,(req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.fileUpload();
    });

    router.post('/users/socialAccess', Validators.socialAccessValidator(), Validators.validate, (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.socialAccess();
    });

    router.post('/users/verifyOTP',(req, res, next) => { 
        const userObj = (new UsersController()).boot(req, res);
        return userObj.verifyOTP();
    });

    router.post('/users/resendOTP', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.resendOTP();
    });

    router.post('/users/checkSocial', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.checkSocial();
    });

    router.post('/users/sendOTPMobile', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.sendOTPMobile();
    });

    router.post('/users/resendOtpMobile', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.resendOtpMobile();
    });

    router.post('/users/homeListing',(req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.homeListing();
    });

    router.post('/users/chefOrDishListing', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.listing();
    });

    router.post('/getCuisineList', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.getCuisineList();
    });

    router.post('/getPreferenceList', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.getPreferenceList();
    });

    router.post('/getChefDetails', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.getChefDetails();
    });

    router.post('/getDishDetails', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.getDishDetails();
    });


    router.post('/getDishRatingReview', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.getDishRatingReview();
    });
    

    router.post('/getChefComplements', (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.getChefComplements();
    });
    
    router.get('/users/deActivateAccount', Globals.isAuthorized, (req, res, next) => {
        const userObj = (new UsersController()).boot(req, res);
        return userObj.deActivateAccount();
    });

    
    app.use(config.baseApiUrl, router);
}