const _ = require("lodash");
const i18n = require("i18n");

const Controller = require("../Base/Controller");
const NewsFeedSchema = require('./Schema').NewsFeed;
const NewsFeedCommentSchema = require('./Schema').NewsFeedComment;
const UserSchema = require('../User/Schema').Users;
const CommonService = require("../../services/Common");
const RequestBody = require("../../services/RequestBody");
const exportLib = require('../../../lib/Exports');
const config = require('../../../configs/configs');

class NewsFeedController extends Controller {

    constructor() {
        super();
    }

    /********************************************************
    Purpose: Listing data
    Parameter:
    {
        "page": 1,
        "pageSize": 10,
        "searchText": "",
        "sort": { createdAt: 1 }
    }
    Return: JSON String
    ********************************************************/
    async getNewsFeedList() {
        try {
            let reqData = this.req.body;
            let perPage = 10;
            let skip = (reqData.page - 1) * (perPage);

            let whereCnd = { status: true };
            if (reqData.searchText) {
                whereCnd.title = { [Op.like]: `%${reqData.searchText}%` };
            }

            let searchLng = this.req.body.longitude;
            let searchLat = this.req.body.latitude;
            let distanceQuery = `ST_Distance_Sphere(addressPoint, point(${searchLng}, ${searchLat}) ) * .000621371192`;


            let listData = await NewsFeedSchema.findAll({
                attributes: ['id', [sequelizeConnection.literal(distanceQuery), 'distance'],'title', 'description', 'imagesPath', 'videoUrl', 'totalComment', 'createdAt'],
                include: [{ model: UserSchema, attributes: ['id', 'firstName', 'lastName', 'photo'], where: { adminStatus: 'Approved' }, required: true }],
                having: {
                    distance: {
                        [Op.lt]: 50
                    }
                },
                where: whereCnd,
                offset: skip, limit: perPage, order: [['id', 'DESC']]
            });

            let count = await NewsFeedSchema.findAll({
                attributes: ['id', [sequelizeConnection.literal(distanceQuery), 'distance'],'title', 'description', 'imagesPath', 'videoUrl', 'totalComment', 'createdAt'],
                include: [{ model: UserSchema, attributes: ['id', 'firstName', 'lastName', 'photo'], where: { adminStatus: 'Approved' }, required: true }],
                having: {
                    distance: {
                        [Op.lt]: 50
                    }
                },
                where: whereCnd
            });

            let lastPage = Math.ceil(listData.length / perPage);
            return exportLib.Response.handleListingResponseMinField(this.res, { code: 'SUCCESS', message: "", data: listData, current_page: reqData.page, last_page: lastPage, per_page: perPage, total: count.length });
        }
        catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
     Purpose: details
     Return: JSON String
     ********************************************************/
    async getNewsFeed() {
        try {
            let reqData = this.req.body;

            let resultData = await NewsFeedSchema.findOne({
                attributes: ['id', 'title', 'description', 'imagesPath', 'videoUrl', 'totalComment', 'createdAt'],
                include: [{ model: UserSchema, attributes: ['id', 'firstName', 'lastName', 'photo'], required: true }],
                where: { id: reqData.newsFeedId }
            });

            if (_.isEmpty(resultData)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NOT_FOUND });
            } else {
                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS, data: resultData });
            }
        } catch (error) {
            console.log("error- ", error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
    Purpose: Listing data
    Parameter:
    {
        "page": 1,
        "pageSize": 10,
        "searchText": "",
        "sort": { createdAt: 1 }
    }
    Return: JSON String
    ********************************************************/
    async getNewsFeedCommentList() {
        try {
            let reqData = this.req.body;
            let perPage = 50;
            let skip = (reqData.page - 1) * (perPage);

            let whereCnd = { newsFeedId: reqData.newsFeedId };

            let listData = await NewsFeedCommentSchema.findAndCountAll({
                attributes: ['id', 'comment', 'createdAt'],
                include: [{ model: UserSchema, attributes: ['id', 'firstName', 'lastName', 'photo'], required: true }],
                where: whereCnd,
                offset: skip, limit: perPage, order: [['id', 'DESC']]
            });


            let lastPage = Math.ceil(listData.count / perPage);
            return exportLib.Response.handleListingResponseMinField(this.res, { code: 'SUCCESS', message: "", data: listData.rows, current_page: reqData.page, last_page: lastPage, per_page: perPage, total: listData.count });
        }
        catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
    Purpose: add record
    Return: JSON String
    ********************************************************/
    async addComment() {
        try {
            let currentUser = this.req.currentUser;
            let reqData = this.req.body;

            let newsFeedData = await NewsFeedSchema.findOne({
                where: { id: reqData.newsFeedId }
            });

            if (_.isEmpty(newsFeedData)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NOT_FOUND });
            }

            let fieldsArray = ["comment"];
            let data = await (new RequestBody()).processRequestBody(reqData, fieldsArray);

            let addedData = await NewsFeedCommentSchema.create({
                comment: data.comment,
                newsFeedId: reqData.newsFeedId,
                userId: currentUser.id
            });

            let resData = {
                id: addedData.id,
                comment: addedData.comment,
                createdAt: addedData.createdAt,
                User: {
                    id: currentUser.id,
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    photo: currentUser.photo
                }
            }

            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS, data: { resultData: resData } });
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
     Purpose: delete
     Return: JSON String
     ********************************************************/
    async deleteComment() {
        try {
            let currentUser = this.req.currentUser;
            let reqData = this.req.body;

            let resultData = await NewsFeedCommentSchema.findOne({
                where: { id: reqData.commentId }
            });

            if (_.isEmpty(resultData)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NOT_FOUND });
            } else if(resultData.userId != currentUser.id) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.UNAUTHORIZED_TO_ACCESS });
            } else {
                await resultData.destroy();
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.COMMENT_DELETE });
            }

        } catch (error) {
            console.log("error- ", error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

}

module.exports = NewsFeedController;
