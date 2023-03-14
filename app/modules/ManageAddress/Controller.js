const _ = require('lodash');
const i18n = require("i18n");

const Controller = require('../Base/Controller');
const Model = require("../Base/Model");
const Address = require('./Schema').Address;
const Order = require('../Order/Schema').Order;
const CommonService = require("../../services/Common");
const exportLib = require('../../../lib/Exports');
const { at } = require('lodash');
const Form = require("../../services/Form");
const File = require("../../services/File");
const config = require('../../../configs/configs');
const { limit255 } = require('jimp');


class ManageAddressController extends Controller {

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
     Purpose:Attribute list
     Parameter:
     {
            "page":1,
            "pagesize":10,
            "columnKey":"blogListing"
     }
     Return: JSON String
     ********************************************************/
    async addressList() {
        try {
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let userId = {userId:this.req.body.userId}
            let limit = Object.values(this.req.body).indexOf('perPage') > -1 ? this.req.body.perPage : 10
           
            // "id","firstName","addressOne": "Ahmedabad",
            var skip = (this.req.body.page-1)*limit; 
            let {count,rows} = await Address.findAndCountAll({where:userId,attributes:["id","firstName","addressOne","addressTwo", "country","state","city","countryCode","mobile","addressType","primaryAddressStatus","longitude","latitude","zipcode"]
            ,offset:skip,limit:limit});
            let nextPage = await this.getNextPage(this.req.body.page,limit,count)
            let url =  'http://'+ config.host +'/' + 'addressList'
            return exportLib.Response.handleListingResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:rows,current_page:this.req.body.page,from: 21,last_page:nextPage,path:url,per_page:this.req.body.perPage,to: 23,total:count});
           
        }
        catch (error) {
            console.log(error);
            this.res.send({ status: 0, message: error });
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
    async addAddress(){
        try {
          
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            if (this.req.body.id == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }
            if (this.req.body.firstName == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.firstName});
            }
            if (this.req.body.addressOne == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.addressOne});
            }
            if (this.req.body.addressTwo == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.addressTwo});
            }
            if (this.req.body.country == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.country});
            }
            if (this.req.body.state == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.state});
            }
            if (this.req.body.city == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.city});
            }
            if (this.req.body.countryCode == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.countryCode});
            } 
            if (this.req.body.mobile == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.mobile});
            }
            if (this.req.body.longitude == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.longitude});
            }
            if (this.req.body.latitude == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.latitude});
            }

            let count = await Address.count({ where: { userId:this.req.body.userId }});

            if(count == 10)
            {
                return exportLib.Error.handleError(this.res, { status: true, code: 'CONFLICT', message: exportLib.ResponseEn.LIMIT_ADDRESS});
            }
            else{
            let setObject = {
                userId:this.req.body.userId,
                firstName: this.req.body.firstName,
                addressOne: this.req.body.addressOne,
                addressTwo: this.req.body.addressTwo,
                countryCode: this.req.body.countryCode,
                mobile:this.req.body.mobile,
                city:this.req.body.city,
                addressType:this.req.body.addressType,
                state:this.req.body.state,
                country:this.req.body.country,
                longitude:this.req.body.longitude,
                latitude:this.req.body.latitude,
                zipcode:this.req.body.zipcode
               
                }
                let latitude = Number(this.req.body.latitude)
                let longitude = Number(this.req.body.longitude)
                setObject['addressPoint'] = {
                    type: 'Point',
                    coordinates: [longitude,latitude]
                }
            
                const addressDetails = await Address.create(setObject);
                let response = {
                    id:addressDetails.id,
                    userId:addressDetails.userId,
                    firstName: addressDetails.firstName,
                    addressOne: addressDetails.addressOne,
                    addressTwo: addressDetails.addressTwo,
                    countryCode: addressDetails.countryCode,
                    mobile:addressDetails.mobile,
                    city:addressDetails.city,
                    addressType:addressDetails.addressType,
                    primaryAddressStatus:addressDetails.primaryAddressStatus,
                    state:addressDetails.state,
                    country:addressDetails.country,
                    longitude:addressDetails.longitude,
                    latitude:addressDetails.latitude,
                    zipcode:addressDetails.zipcode
                }
                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_SAVE_ADDRESS,data:response});
            }
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
    /********************************************************
     Purpose: update Attribute
     Parameter:
     {
           "id":"id"
           "name": "blog 1",
            "displayName": "content",
            "description": "content",
     }
     Return: JSON String
     ********************************************************/
    async updateAddress(){
        try {
          
            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }
            if (this.req.body.firstName == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.firstName});
            }
            if (this.req.body.addressOne == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.addressOne});
            }
            if (this.req.body.addressTwo == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.addressTwo});
            }
            if (this.req.body.country == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.country});
            }
            if (this.req.body.state == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.state});
            }
            if (this.req.body.city == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.city});
            }
            if (this.req.body.countryCode == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.countryCode});
            } 
            if (this.req.body.mobile == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.mobile});
            }
            if (this.req.body.longitude == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.longitude});
            }
            if (this.req.body.latitude == '') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.latitude});
            }

            let setObject = {};
            this.req.body.firstName ? (setObject.firstName = this.req.body.firstName) : delete setObject.firstName;
            this.req.body.addressOne ? (setObject.addressOne = this.req.body.addressOne) : delete setObject.addressOne;
            this.req.body.addressTwo ? (setObject.addressTwo = this.req.body.addressTwo) : delete setObject.addressTwo;
            this.req.body.country ? (setObject.country = this.req.body.country) : delete setObject.country;
            this.req.body.state ? (setObject.state = this.req.body.state) : delete setObject.state;
            this.req.body.city ? (setObject.city = this.req.body.city) : delete setObject.city;
            this.req.body.countryCode ? (setObject.countryCode = this.req.body.countryCode) : delete setObject.countryCode;
            this.req.body.mobile ? (setObject.mobile = this.req.body.mobile) : delete setObject.mobile;
          
            this.req.body.longitude ? (setObject.longitude = this.req.body.longitude) : delete setObject.longitude;
            this.req.body.latitude ? (setObject.latitude = this.req.body.latitude) : delete setObject.latitude;
            this.req.body.addressType ? (setObject.addressType = this.req.body.addressType) : delete setObject.addressType;
            this.req.body.zipcode ? (setObject.zipcode = this.req.body.zipcode) : delete setObject.zipcode;
           
            let latitude = Number(this.req.body.latitude)
            let longitude = Number(this.req.body.longitude)
            setObject['addressPoint'] = {
                type: 'Point',
                coordinates: [longitude,latitude]
            }
            
                await Address.update(setObject,{where:{id:this.req.body.id}});
                let addressDetails = await Address.findOne({where:{id:this.req.body.id}})
                let response = {
                    id:addressDetails.id,
                    userId:addressDetails.userId,
                    firstName: addressDetails.firstName,
                    addressOne: addressDetails.addressOne,
                    addressTwo: addressDetails.addressTwo,
                    countryCode: addressDetails.countryCode,
                    mobile:addressDetails.mobile,
                    city:addressDetails.city,
                    addressType:addressDetails.addressType,
                    primaryAddressStatus:addressDetails.primaryAddressStatus,
                    state:addressDetails.state,
                    country:addressDetails.country,
                    longitude:addressDetails.longitude,
                    latitude:addressDetails.latitude,
                    zipcode:addressDetails.zipcode
                }
                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS,data:response});
            
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
     /********************************************************
     Purpose: update Attribute
     Parameter:
     {
           "id":"id"
           "name": "blog 1",
            "displayName": "content",
            "description": "content",
     }
     Return: JSON String
     ********************************************************/
    async updateAddressStatus(){
        try {
            
            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }

                let setObject = {};
                setObject.primaryAddressStatus = true
                 await Address.update({primaryAddressStatus:true},{where:{id:this.req.body.id}});
                 setObject.primaryAddressStatus = false
                 await Address.update(setObject,{where:{id: {[Op.ne]: this.req.body.id },userId:this.req.body.userId}});

                 //deleting the cart values when user updated primary address
                 let orderCheckId = await Order.findOne({where:{userId:this.req.body.id,orderStatus:'Cart'}});
                 if(orderCheckId)
                 {
                    await Order.destroy({where:{id:orderCheckId.id,orderStatus:'Cart' }});
                    await OrderDetails.destroy({where:{orderId:orderCheckId.id}});
                 }  

                 return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_UPDATE_ADDRESS});
            
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
    /********************************************************
     Purpose: delete Attribute
     Parameter:
     {
           "id":"id"
     }
     Return: JSON String
     ********************************************************/
    async deleteAddress(){
        try {
          
            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }
           
                
                await Address.destroy({ where: { id: this.req.body.id } });


                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_DELETE_ADDRESS});
            
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
    /********************************************************
     Purpose: delete Attribute
     Parameter:
     {
           "id":"id"
     }
     Return: JSON String
     ********************************************************/
    async getPrimaryAddress(){
        try {
          
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }
           
                
                let addressDetails = await Address.findOne({attributes:["id","firstName","addressOne","addressTwo","country","state","city","countryCode","mobile","addressType","longitude","latitude","zipcode","userId"], where: {userId: this.req.body.userId,primaryAddressStatus:true } });


                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS_DELETE_ADDRESS,data:addressDetails});
            
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }     
    
   

}
module.exports = ManageAddressController;