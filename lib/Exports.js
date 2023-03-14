let ErrorHandler = require('../lib/ErrorHandler');
let    ResponseHandler = require('../lib/ResponseHandler');
 let   Error = new ErrorHandler();
 let   Response = new ResponseHandler();
 let   ResponseEn = require('../app/locales/en.json')

module.exports = {
    Error, 
    Response,
     ResponseEn
};