const _ = require("lodash");

const Controller = require("../Base/Controller");
const NotificationSchema = require('./Schema').Notification;
const exportLib = require('../../../lib/Exports');

class NotificationController extends Controller {

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
    async getNotificationList() {
        try {
            //let currentUser = this.req.currentUser;
            let reqData = this.req.body;
            let perPage = 10;
            let skip = (reqData.page - 1) * (perPage);

            let listData = await NotificationSchema.findAndCountAll({
                where: { userId: this.req.body.userId },
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

}

module.exports = NotificationController;