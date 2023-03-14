module.exports = (app, express) => {

    const router = express.Router();

    const Globals = require("../../../configs/Globals");
    const Controller = require('./Controller');
    const config = require('../../../configs/configs');
    const Validators = require("./Validator");

    router.post('/getNewsFeedList', Validators.listingValidator(), Validators.validate, (req, res, next) => {
        const obj = (new Controller()).boot(req, res);
        return obj.getNewsFeedList();
    });

    router.post('/getNewsFeed', Validators.detailValidator(), Validators.validate, (req, res, next) => {
        const obj = (new Controller()).boot(req, res);
        return obj.getNewsFeed();
    });

    router.post('/getNewsFeedCommentList',Validators.listingCommentValidator(), Validators.validate, (req, res, next) => {
        const obj = (new Controller()).boot(req, res);
        return obj.getNewsFeedCommentList();
    });

    router.post('/addNewsFeedComment', Globals.isAuthorized, Validators.addCommentValidator(), Validators.validate, (req, res, next) => {
        const obj = (new Controller()).boot(req, res);
        return obj.addComment();
    });

    router.post('/deleteNewsFeedComment', Globals.isAuthorized, Validators.detailValidator({ "key": "commentId" }), Validators.validate, (req, res, next) => {
        const obj = (new Controller()).boot(req, res);
        return obj.deleteComment();
    });

    app.use(config.baseApiUrl, router);
}
