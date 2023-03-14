const errorCodes = {
    "BAD_REQUEST":400,
    "UNAUTHORIZED":401,
    "ALREADY_EXISTS":402,
    "FORBIDDEN":403,
    "UNPROCESSABLE_ENTITY":422,
    "NOT_FOUND":404,
    "REQUEST_TIMEOUT":408,
    "INTERNAL_SERVER_ERROR":500,
    "NOT_IMPLEMENTED":501,
    "CONFLICT":409,
    "NOT_ACCEPTABLE":406,
};


class ErrorHandler {
    constructor() {
    }

    parseError(errorObj) {
        errorObj.name = '';
        errorObj = JSON.parse(errorObj.toString());
        errorObj = errorObj && errorObj.code ? errorObj : { code: 'INTERNAL_SERVER_ERROR', message: exportLib.response[500] };
        return errorObj;
    }

    // Log the error , terminate process and return error response
    handleError(res, errorObj){
        // Log the error if you want
    //  console.log(res,'res');
    // console.log(errorObj,'errorObj');
        res.status(errorCodes[errorObj.code]).send({error:{message: errorObj.message, meta: {}}});
    }

    // Log the expection , skip and countinue execution
    // handleException(status, statusCode, message, data={}){
    //
    // }
}
module.exports = ErrorHandler;
