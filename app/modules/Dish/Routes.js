 module.exports = (app, express) => {

     //const router = express.Router();

//     const Globals = require("../../../configs/Globals");
//     const CatalogueController = require('../Dish/Controller');
//     const config = require('../../../configs/configs');
//     //const Validators = require("./Validator");

//     router.post('/addAttribute',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.addAttribute();
//     });

//     router.put('/updateAttribute', (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.updateAttribute();
//     });

//     router.post('/attributeList',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.attributeList();
//     });

//     router.post('/categoryList', (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.categoryList();
//     });
//     router.post('/deleteAttribute',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.deleteAttribute();
//     });

//     router.post('/addedDish',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.addedDish();
//     });
//     router.post('/attributeDetail',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.attributeDetail();
//     });
    
//     const multer = require('multer')
//         , inMemoryStorage = multer.memoryStorage()
//         , uploadStrategy = multer({ storage: inMemoryStorage }).single('image')
//         //,uploadStrategy = multer({ storage: inMemoryStorage }).array('image')
        

//     router.post('/testing',uploadStrategy,(req, res, next) => {
//         console.log('testing')
//         const blogObj = (new CatalogueController()).boot(req, res);
//         return blogObj.addedDish();
//     });


//     router.post('/dishList',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.dishList();
//     });

//     router.post('/dishDetail',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.dishDetail();
//     });

//     router.post('/deleteDish',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.deleteDish();
        
//     });
//     router.post('/updateDish',Globals.isAuthorised, (req, res, next) => {
//         const attributeObj = (new CatalogueController()).boot(req, res, next);
//         return attributeObj.updateDish();
//     });
//     // router.post('/deleteAttribute',Globals.isAuthorised, (req, res, next) => {
//     //     const attributeObj = (new CatalogueController()).boot(req, res, next);
//     //     return attributeObj.deleteAttribute();
//     // });
    // app.use(config.baseApiUrl, router);
 }