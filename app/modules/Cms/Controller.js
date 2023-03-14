
const _ = require('lodash');
const i18n = require("i18n");

const Controller = require('../Base/Controller');
const Model = require("../Base/Model");
const FaqCategorySchema = require('./Schema').FaqCategory;
const FAQSchema = require('./Schema').FAQ;
const CmsPage = require('./Schema').CmsPage;
const ContactUs = require('./Schema').ContactUs;
const OrderSchema = require('../Order/Schema').Order;
const CommonService = require("../../services/Common");
const exportLib = require('../../../lib/Exports');
const { at } = require('lodash');
const Form = require("../../services/Form");
const File = require("../../services/File");
const config = require('../../../configs/configs');
const { limit255 } = require('jimp');
const Email = require('../../services/Email');
const UserSchema = require("../User/Schema").Users;

class CMSController extends Controller {

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
     Purpose: get FAQ Listing
     Parameter:
     {
            "name": "blog 1",
            "displayName": "content",
            "description": "content",
     }
     Return: JSON String
     ********************************************************/
    async getFaq(){
        try {
            let cmsFaq = await CmsPage.findOne({ where: { templateKey: 'faq' } })
            let faqCategory = await FaqCategorySchema.findOne({ where: { name: 'Customer' }});
            let faqListing = await FAQSchema.findAll({
                where: { status: true, categoryId: faqCategory.id },
                order: [['displayOrder', 'ASC']]
            });
          
            let faqResponse={
                faqDesorption:cmsFaq.content, 
                faqList:faqListing
            }

            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REPORT_SUCCESS,data:faqResponse});
        } catch (error) {
            console.log(error)
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR'});
        }
    }
     /********************************************************
     Purpose: get FAQ Listing
     Parameter:
     {
            "name": "blog 1",
            "displayName": "content",
            "description": "content",
     }
     Return: JSON String
     ********************************************************/
    async getCmsPage(){
        try {
          
                    let cmsFaq = await CmsPage.findOne({where:{templateKey:this.req.body.pageType}})
           
                    if (_.isEmpty(cmsFaq)) {
                        return exportLib.Response.handleMessageResponse(this.res, { status: false, code: 'SUCCESS', message: exportLib.ResponseEn.NO_RECORD});
                    }

                    return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REPORT_SUCCESS,data:cmsFaq});
            
        } catch (error) {
            console.log(error)
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR'});
        }
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
    async addContactUs(){
        try {
            let reqData = this.req.body;
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let tickets = await ContactUs.findAll({});
            let countValue = (tickets.length) + 1;
            let key = (countValue.toString().length) > 2 ? "" : (countValue.toString().length == 2 ? "0" : "00");
            let ticketId = "HS" + (key + countValue);

            let setObject = {
                type:this.req.body.type,
                orderId:this.req.body.orderId ? this.req.body.orderId : null ,
                userId:this.req.body.userId,
                userRole: 'Customer',
                message:this.req.body.message, 
                ticketId
            }
            await ContactUs.create(setObject);

            if(reqData.userId) {
                let user = await UserSchema.findOne({ where: { id: reqData.userId } });
                let emailData = {
                    emailId: user.emailId,
                    templateKey: 'contactus_mail',
                    replaceDataObj: { ticketId, reason: reqData.type, message: reqData.message }
                };
                await new Email().sendMail(emailData);
            }
            
            exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.CONTACT_SUCCESS});

            if (reqData.type == 'Order' && reqData.orderId) {
                let order = await OrderSchema.findOne({ where: { id: reqData.orderId } });
                let notificationData = {
                    templateKey: 'admin_help_order',
                    dataId: reqData.orderId,
                    replaceDataObj: {
                        orderId: order.orderUnique
                    },
                    userType: 'Customer',
                    userId: reqData.userId ? reqData.userId : null
                }
                await new CommonService().sendNotificationToAdmin(notificationData);
            }
          
        } catch (error) {
            console.log(error)
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR'});
        }
    }
  
}

module.exports = CMSController;