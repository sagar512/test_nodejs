const _ = require('lodash');
const i18n = require("i18n");

const Controller = require('../Base/Controller');
const Model = require("../Base/Model");
const Report = require('./Schema').Report;
const CommonService = require("../../services/Common");
const exportLib = require('../../../lib/Exports');
const { at } = require('lodash');
const Form = require("../../services/Form");
const File = require("../../services/File");
const config = require('../../../configs/configs');
const { limit255 } = require('jimp');
const { Dish } = require('../Dish/Schema');
const { Users } = require('../User/Schema');
const NewsFeedSchema = require('../NewsFeed/Schema').NewsFeed;
const NewsFeedCommentSchema = require('../NewsFeed/Schema').NewsFeedComment;


class ReportController extends Controller {

    constructor() {
        super();
    }
    getNextPage(page, limit, total) { 
        //var page = Number(page),
          var  limits = Number(limit),
            counts = Number(total);
        var divide = counts / limits;
        var lastPage = Math.ceil(divide);
       // if (page < lastPage) return page + 1;
        //return 0;
        return lastPage
    }
   
    
    /********************************************************
     Purpose: added Attribute
     Parameter:
     {
            "name": "blog 1",
            "displayName": "content",
            "description": "content",
     }
     Return: JSON String
     ********************************************************/
    async addReport(){
        try {
          
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
        

            if(this.req.body.reportType == 'Dish')
            {
                let dishName = await Dish.findOne({where:{id:this.req.body.dishId}})
                let userName = await Users.findOne({where:{id:this.req.body.userId}})

                let setObject = {
                    reportType:this.req.body.reportType,
                    reason:this.req.body.reason,
                    userId:this.req.body.userId,
                    dishId:this.req.body.dishId,
                    message:this.req.body.message,
                    reportName: dishName.name,
                    reportBy:userName.firstName + userName.lastName,
                    }
                    await Report.create(setObject);

                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REPORT_SUCCESS});
            }
            else if(this.req.body.reportType == 'Chef')        
            {
                let chefName = await Users.findOne({where:{id:this.req.body.chefId}})
                let userName = await Users.findOne({where:{id:this.req.body.userId}})

                let setObject = {
                    reportType:this.req.body.reportType,
                    userId:this.req.body.userId,
                    reason:this.req.body.reason,
                    chefId:this.req.body.chefId,	
                    message:this.req.body.message,
                    reportName: chefName.firstName + chefName.lastName,
                    reportBy:userName.firstName + userName.lastName,
                    }
                    await Report.create(setObject);

                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REPORT_SUCCESS});
        
            }  
            else if(this.req.body.reportType == 'NewsFeed')        
            {
                let newsFeedName = await NewsFeedSchema.findOne({where:{id:this.req.body.newsFeedId}})
                let userName = await Users.findOne({where:{id:this.req.body.userId}})

                let setObject = {
                    reportType:this.req.body.reportType,
                    userId:this.req.body.userId,
                    reason:this.req.body.reason,
                    newsFeedId:this.req.body.newsFeedId,
                    message:this.req.body.message,
                    reportName: newsFeedName.title,
                    reportBy:userName.firstName + userName.lastName,
                    }
                    await Report.create(setObject);

                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REPORT_SUCCESS});
        
            }  
            else if(this.req.body.reportType == 'Comment')        
            {
                let commentName = await NewsFeedCommentSchema.findOne({where:{id:this.req.body.commentId}})
                let userName = await Users.findOne({where:{id:this.req.body.userId}})

                let setObject = {
                    reportType:this.req.body.reportType,
                    userId:this.req.body.userId,
                    reason:this.req.body.reason,
                    commentId:this.req.body.commentId,
                    message:this.req.body.message,
                    reportName: commentName.comment,
                    reportBy:userName.firstName + userName.lastName,
                    }
                    await Report.create(setObject);

                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REPORT_SUCCESS});
        
            }    
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
  
     
    
    
   

}
module.exports = ReportController;