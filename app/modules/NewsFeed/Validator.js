/****************************
 Validators
 ****************************/
const _ = require("lodash");
let i18n = require("i18n");
const { validationResult } = require('express-validator');
const { body, check, query, header, param } = require('express-validator');
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

    /********************************************************
     Purpose: Function for listing validator
     Parameter: {}
     Return: JSON String
     ********************************************************/
    static listingCommentValidator(params = { "key": "newsFeedId" }) {
        try {
            return [
                check('page').isNumeric().withMessage("Please enter page no."),
                check(params.key).exists().withMessage("Please select newsfeed"),
                check(params.key).not().equals('undefined').withMessage("Please select newsfeed"),
                check(params.key).not().equals('null').withMessage("Please select newsfeed"),
                check(params.key).isAlphanumeric().withMessage("Please select newsfeed"),
                check(params.key).not().isEmpty().withMessage("Please select newsfeed")
            ];
        } catch (error) {
            return error;
        }
    }

    /********************************************************
     Purpose: Function for detailValidator
     Parameter: {}
     Return: JSON String
     ********************************************************/
    static detailValidator(params = { "key": "newsFeedId" }) {
        try {
            return [
                check(params.key).exists().withMessage("Please select an item"),
                check(params.key).not().equals('undefined').withMessage("Please select an item"),
                check(params.key).not().equals('null').withMessage("Please select an item"),
                check(params.key).isAlphanumeric().withMessage("Please select an item"),
                check(params.key).not().isEmpty().withMessage("Please select an item")
            ];
        } catch (error) {
            return error;
        }
    }

    /********************************************************
     Purpose: Function for detailValidator
     Parameter: {}
     Return: JSON String
     ********************************************************/
    static addCommentValidator(params = { "key": "newsFeedId" }) {
        try {
            return [
                check('comment').exists().withMessage("Please enter comment"),
                check(params.key).exists().withMessage("Please select newsfeed"),
                check(params.key).not().equals('undefined').withMessage("Please select newsfeed"),
                check(params.key).not().equals('null').withMessage("Please select newsfeed"),
                check(params.key).isAlphanumeric().withMessage("Please select newsfeed"),
                check(params.key).not().isEmpty().withMessage("Please select newsfeed")
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