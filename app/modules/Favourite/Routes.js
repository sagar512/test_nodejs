module.exports = (app, express) => {

    const router = express.Router();

  //  const Globals = require("../../../configs/Globals");
    const FavouritesController = require('../Favourite/Controller');
    const config = require('../../../configs/configs');
    //const Validators = require("./Validator");

    router.post('/addFavourites', (req, res, next) => {
        const attributeObj = (new FavouritesController()).boot(req, res, next);
        return attributeObj.addFavourites();
    });

    router.post('/favouritesList', (req, res, next) => {
        const attributeObj = (new FavouritesController()).boot(req, res, next);
        return attributeObj.favouritesList();
    });


    app.use(config.baseApiUrl, router);
}