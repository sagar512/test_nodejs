/****************************
 Validators
 ****************************/
const _ = require("lodash");
let i18n = require("i18n");
const { validationResult } = require('express-validator');
const { body, check, query, header, param, oneOf } = require('express-validator');
const exportLib = require('../../../lib/Exports');

class Validators {
    /********************************************************
     Purpose: Function for listing validator
     Parameter: {}
     Return: JSON String
     ********************************************************/
    static listingValidator() {
        try {
            return [
                check('page').isNumeric().withMessage("Please enter page no.")
            ];
        } catch (error) {
            return error;
        }
    }

    static validate(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return exportLib.Error.handleError(res, { code: 'UNPROCESSABLE_ENTITY', message: errors.errors[0].msg });
            }
            next();
        } catch (error) {
            return exportLib.Error.handleError(res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }
}

module.exports = Validators;