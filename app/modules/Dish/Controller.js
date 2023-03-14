const _ = require('lodash');
const i18n = require("i18n");

const Controller = require('../Base/Controller');
const Attribute = require('./Schema').Attribute;
const Dish = require('./Schema').Dish;
const Category = require('../Category/Schema').Category;
const Cuisine = require('../Cuisine/Schema').Cuisine;
const Preference = require('../Preference/Schema').Preference;
const Model = require("../Base/Model");
const CommonService = require("../../services/Common");
const exportLib = require('../../../lib/Exports');
const { at } = require('lodash');
const Form = require("../../services/Form");
const File = require("../../services/File");
const config = require('../../../configs/configs');

class CatalogueController extends Controller {

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
    async attributeList() {
        try {
            if (_.isEmpty(this.req.body.userId)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            var skip = (this.req.body.page-1)*this.req.body.perPage;
            let {count,rows} = await Attribute.findAndCountAll({where:{userId:this.req.body.userId},attributes:["id","name","displayName","description",'price'],offset:skip,limit:this.req.body.perPage});
            let nextPage = await this.getNextPage(this.req.body.page,this.req.body.perPage,count)
            if(_.isEmpty(rows))
            {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.ATTRIBUTE_EXIST});
            }
            return exportLib.Response.handleListingResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:rows,current_page:this.req.body.page,from: 21,last_page:nextPage,path:config.host +'/' + 'attributeList',per_page:this.req.body.perPage,to: 23,total:count});
           
        }
        catch (error) {
            console.log(error);
            this.res.send({ status: 0, message: error });
        }
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
    async categoryList() {
        try {
            
            let categoryList = await Category.findAll({attributes:['id','name','status']});
            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:categoryList});
           
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
    async addAttribute(){
        try {
          
            if (_.isEmpty(this.req.body.name)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ATTRIBUTE_NAME});
            }
            if (_.isEmpty(this.req.body.userId)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let setObject = {
                userId: this.req.body.userId,
                name: this.req.body.name,
                displayName: this.req.body.displayName,
                description: this.req.body.description,
                price: this.req.body.price,
            }
            
                await Attribute.create(setObject);
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ATTRIBUTE_SUCCESS});
            
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
    async updateAttribute(){
        try {
          
            if (_.isEmpty(this.req.body.id)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }
            let setObject = {};
            this.req.body.fields.name ? (setObject.name = this.req.body.fields.name) : delete setObject.name;
            this.req.body.fields.displayName ? (setObject.displayName = this.req.body.fields.displayName) : delete setObject.displayName;
            this.req.body.fields.description ? (setObject.description = this.req.body.fields.description) : delete setObject.description;
            this.req.body.fields.price ? (setObject.price = this.req.body.fields.price) : delete setObject.price;
          
            
                await Attribute.update(setObject,{where:{id:this.req.body.id}});
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.ATTRIBUTE_UPDATE});
            
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
    /********************************************************
     Purpose:Attribute details
     Parameter:
     {}
     Return: JSON String
     ********************************************************/
    async attributeDetail() {
        try {
            const attributeDetail = await Attribute.findOne({ where: { id: this.req.body.id } });
            if(_.isEmpty(attributeDetail))
            {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.ATTRIBUTE_EXIST});
            }
            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:attributeDetail});
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
   
    /********************************************************
     Purpose:Dish list
     Parameter:
     {
            "page":1,
            "pagesize":10,
            "columnKey":"blogListing"
     }
     Return: JSON String
     ********************************************************/
    async dishList() {
        try {
            
            if (_.isEmpty(this.req.body.userId)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
            var skip = (this.req.body.page-1)*this.req.body.perPage;
            let {count,rows} = await Dish.findAndCountAll({where:{userId:this.req.body.userId,isDelete:false},
                include:[{model:Category,attributes:['name']},{model:Cuisine,attributes:['name']},{model:Preference,attributes:['name']}],
                offset:skip,limit:this.req.body.perPage});
            let nextPage = await this.getNextPage(this.req.body.page,this.req.body.perPage,count)
            if(_.isEmpty(rows))
            {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.ATTRIBUTE_EXIST});
            }

            rows.map((result,key)=> {
                rows[key] ={
                        "id": result.id,
                        "name":result.name ,
                        "media":result.media ,
                        "description":result.description,
                        "price":result.price,
                        "type":result.type,
                        "preparationTime":result.preparationTime,
                        "calories":result.calories,
                        "protein":result.protein,
                        "fat":result.fat,
                        "carbohydrate":result.carbohydrate,
                        "categoryId":result.categoryId,
                        "categoryName": result.Category && result.Category.name ? result.Category.name : '',
                        "cuisineId":result.cuisineId,
                        "cuisineName": result.Cuisine && result.Cuisine.name ? result.Cuisine.name : '',
                        preferenceId:result.preferenceId ? result.preferenceId : '',
                        preferenceName:result.Preference && result.Preference.name ? result.Preference.name : '',
                        "userId": result.userId,

                }
                //console.log(result);

            })
            return exportLib.Response.handleListingResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:rows,current_page:this.req.body.page,from: 21,last_page:nextPage,path:config.host +'/' + 'attributeList',per_page:this.req.body.perPage,to: 23,total:count});
         
        }
        catch (error) {
            console.log(error);
            this.res.send({ status: 0, message: error });
        }
    }
    /********************************************************
    Purpose: Added Dish
    Parameter:
        {
            "name": "name",
            "image": "array",
            "description": "test",
        }
    Return: JSON String
   ********************************************************/
  async addedDish() {
    try {
        
        if (_.isEmpty(this.req.body.userId)) {
            return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
        }
        
        let setObject = {}
            this.req.body.name ? (setObject.name = this.req.body.name) : delete setObject.name;
            this.req.body.description ? (setObject.description = this.req.body.description) : delete setObject.description;
            this.req.body.price ? (setObject.price = this.req.body.price) : delete setObject.price;
            this.req.body.type ? (setObject.type = this.req.body.type) : delete setObject.type;
            this.req.body.preparationTime ? (setObject.preparationTime = this.req.body.preparationTime) : delete setObject.preparationTime;
            this.req.body.calories ? (setObject.calories = this.req.body.calories) : delete setObject.calories;
            this.req.body.protein ? (setObject.protein = this.req.body.protein) : delete setObject.protein;
            this.req.body.fat ? (setObject.fat = this.req.body.fat) : delete setObject.fat;
            this.req.body.carbohydrate ? (setObject.carbohydrate = this.req.body.carbohydrate) : delete setObject.carbohydrate;
            this.req.body.attributeId ? (setObject.attributeId = this.req.body.attributeId) : delete setObject.attributeId;
            this.req.body.media ? (setObject.media = this.req.body.media) : delete setObject.media;


            this.req.body.categoryId ? (setObject.categoryId = this.req.body.categoryId) : delete setObject.categoryId;
            this.req.body.cuisineId ? (setObject.cuisineId = this.req.body.cuisineId) : delete setObject.cuisineId;
            this.req.body.userId ? (setObject.userId = this.req.body.userId) : delete setObject.userId;

            this.req.body.dishStatus ? (setObject.dishStatus = this.req.body.dishStatus) : delete setObject.dishStatus;
            this.req.body.preferenceId ? (setObject.preferenceId = this.req.body.preferenceId) : delete setObject.preferenceId;
            
            
            setObject.saleType = 'Selling'
            
            
             await Dish.create(setObject);
             exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.DISH_SUCCESS});
           
         
         

    } catch (error) {
        console.log("error = ", error);
        this.res.send({ status: 0, message: error });
    }
}
/********************************************************
     Purpose: Delete Dish
     Parameter:
     {
           "id":"1"
     }
     Return: JSON String
     ********************************************************/
    async dishDetail(){
        try {
          
            if (_.isEmpty(this.req.body.id)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID});
            }

            let result = await Dish.findOne({where:{id:this.req.body.id,isDelete:false},
                include:[{model:Category,attributes:['name']},{model:Cuisine,attributes:['name']},{model:Preference,attributes:['name']}],
                });
                if(_.isEmpty(result))
            {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.ATTRIBUTE_EXIST});
            }
                   
               
                let Response = {
                            "id": result.id,
                            "name":result.name ,
                            "media":result.media ,
                            "description":result.description,
                            "price":result.price,
                            "type":result.type,
                            "preparationTime":result.preparationTime,
                            "calories":result.calories,
                            "protein":result.protein,
                            "fat":result.fat,
                            "carbohydrate":result.carbohydrate,
                            "categoryId":result.categoryId,
                            "categoryName": result.Category && result.Category.name ? result.Category.name : '',
                            "cuisineId":result.cuisineId,
                            "cuisineName": result.Cuisine && result.Cuisine.name ? result.Cuisine.name : '',
                            preferenceId:result.preferenceId ? result.preferenceId : '',
                            preferenceName:result.Preference && result.Preference.name ? result.Preference.name : '',
                            "userId": result.userId,
    
                    }
                   // console.log(result);
    
            
                
                return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS,data:Response});
            
        } catch (error) {
            console.log(error);
            return this.res.send({ status: 0, message: error });
        }
    }
     /********************************************************
    Purpose: Added Dish
    Parameter:
        {
            "name": "name",
            "image": "array",
            "description": "test",
        }
    Return: JSON String
   ********************************************************/
  async updateDish() {
    try {
        
        if (_.isEmpty(this.req.body.id)) {
            return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
        }
        if (_.isEmpty(this.req.body.userId)) {
            return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
        }
        
        let setObject = {}
            this.req.body.name ? (setObject.name = this.req.body.name) : delete setObject.name;
            this.req.body.description ? (setObject.description = this.req.body.description) : delete setObject.description;
            this.req.body.price ? (setObject.price = this.req.body.price) : delete setObject.price;
            this.req.body.type ? (setObject.type = this.req.body.type) : delete setObject.type;
            this.req.body.preparationTime ? (setObject.preparationTime = this.req.body.preparationTime) : delete setObject.preparationTime;
            this.req.body.calories ? (setObject.calories = this.req.body.calories) : delete setObject.calories;
            this.req.body.protein ? (setObject.protein = this.req.body.protein) : delete setObject.protein;
            this.req.body.fat ? (setObject.fat = this.req.body.fat) : delete setObject.fat;
            this.req.body.carbohydrate ? (setObject.carbohydrate = this.req.body.carbohydrate) : delete setObject.carbohydrate;
            this.req.body.attributeId ? (setObject.attributeId = this.req.body.attributeId) : delete setObject.attributeId;
            this.req.body.media ? (setObject.media = this.req.body.media) : delete setObject.media;


            this.req.body.categoryId ? (setObject.categoryId = this.req.body.categoryId) : delete setObject.categoryId;
            this.req.body.cuisineId ? (setObject.cuisineId = this.req.body.cuisineId) : delete setObject.cuisineId;
            this.req.body.userId ? (setObject.userId = this.req.body.userId) : delete setObject.userId;

            this.req.body.dishStatus ? (setObject.dishStatus = this.req.body.dishStatus) : delete setObject.dishStatus;
            this.req.body.preferenceId ? (setObject.preferenceId = this.req.body.preferenceId) : delete setObject.preferenceId;
            
            
            setObject.saleType = 'Selling'
            
            
             await Dish.update(setObject,{where:{id:this.req.body.id}});
             exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.DISH_SUCCESS});
           
         
         

    } catch (error) {
        console.log("error = ", error);
        this.res.send({ status: 0, message: error });
    }
}

}
module.exports = CatalogueController;