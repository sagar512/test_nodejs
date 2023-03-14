const _ = require('lodash');
const i18n = require("i18n");

const Controller = require('../Base/Controller');
const Favourites = require('./Schema').Favourites;
const Address = require('../ManageAddress/Schema').Address;
const Cuisine = require('../Cuisine/Schema').Cuisine;
const Dish = require('../Dish/Schema').Dish;
const Users = require('../User/Schema').Users;
const Model = require("../Base/Model");
const CommonService = require("../../services/Common");
const exportLib = require('../../../lib/Exports');
const { at, result } = require('lodash');
const config = require('../../../configs/configs');

class FavouritesController extends Controller {

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
            "userId": 1,
     }
     Return: JSON String
     ********************************************************/
    async favouritesList() {
        try {
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }
           
            if(this.req.body.type == 'Chef')
            {
                let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = addressDetails.latitude, searchLng = addressDetails.longitude;
              let distanceQuery = `ST_Distance_Sphere(\`chef->chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                let limit = this.req.body.perPage ? this.req.body.perPage : 10
                var skip = (this.req.body.page-1)*limit;
                let {rows} = await Favourites.findAndCountAll({where:{userId:this.req.body.userId,chefId:{[Op.ne]:null}},
                    'include':[
                        {model:Users,as:'chef',attributes:["id","firstName","lastName","photo","totalRating","isOnline","avgRate","businessHourStart","businessHourEnd","topDishSelling"],
                            'include':[
                                {model:Cuisine,attributes:["id","name"],through: { attributes: [] }},
                                { model: Address, as: 'chefAddress', attributes: [[sequelizeConnection.literal(distanceQuery), 'distance']],where:{addressType:'Work'} },
                            ]
                        }
                    ],
                    order:[['createdAt','DESC']],offset:skip,limit:limit});

                let nextPage = await this.getNextPage(this.req.body.page,limit,rows.length)
                if(_.isEmpty(rows))
                {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: ''});
                }
                let response = []
                rows.filter(results => {
                   
                    if(results.chef)
                    {
                        let data = results.chef.toJSON()
                        let setObject = {
                            "id": data.id,
                            "firstName": data.firstName,
                            "lastName": data.lastName,
                            "photo": data.photo,
                            "totalRating": data.totalRating,
                            "avgRate": data.avgRate,
                            "isOnline":data.isOnline,
                            "businessHourStart": data.businessHourStart,
                            "businessHourEnd": data.businessHourEnd,
                            topDishSelling:data.topDishSelling,
                            distance: data.chefAddress ? Math.round(data.chefAddress.distance) + ' miles' : '',
                            cuisineName:data  && data.Cuisines ? _.map(data.Cuisines,'name').toString() : ''
                        }
                        response.push(setObject)
                    }
                })
                let url =  'http://'+ config.host +'/' + 'favouritesList'
                return exportLib.Response.handleListingResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:response,current_page:this.req.body.page,from: 21,last_page:nextPage,path:url,per_page:limit,to: 23,total:response.length});
             
            }
            if(this.req.body.type == 'Dish')
            {
                let limit =this.req.body.perPage ? this.req.body.perPage : 10
                var skips = (this.req.body.page-1)*limit;
                let {count,rows} = await Favourites.findAndCountAll({where:{userId:this.req.body.userId},
                    include:[{model:Dish,attributes:["id","name","media","price","totalRating","avgRate",'type','isPreOrderOnly'],
                    include:[{model:Cuisine,attributes:["id","name"]}],
                    include:[{model:Users,attributes: ["id","firstName","lastName"]}]}
                    ]
                    ,
                    order:[['createdAt','DESC']],offset:skips,limit:limit});


                let nextPage = await this.getNextPage(this.req.body.page,limit,count)
                if(_.isEmpty(rows))
                {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: ''});
                }
                 let response = []
                 rows.filter(data => {
                    if(data.Dish)
                    {
                        let setObject = {
                            "id": data.Dish.id,
                            "name": data.Dish.name,
                            "media": data.Dish.media,
                            "photo": data.Dish.photo,
                            "price": '$' + ' ' + (data.Dish.price).toFixed(2),
                            type:data.Dish.type,
                            "totalRating": data.Dish.totalRating,
                            chefName:data.Dish.User.firstName + ' '+data.Dish.User.lastName,
                            isPreOrderOnly: data.Dish.isPreOrderOnly,
                            "avgRate": data.Dish.avgRate,
                            cuisineName:data.Dish  && data.Dish.Cuisine ? data.Dish.Cuisine.name : ''
                        }
                        response.push(setObject)
                    }
                })
                let url =  'http://'+ config.host +'/' + 'favouritesList'
                return exportLib.Response.handleListingResponse(this.res, { status: true, code: 'SUCCESS', message: "",data:response,current_page:this.req.body.page,from: 21,last_page:nextPage,path:url,per_page:limit,to: 23,total:response.length});
             
            }
             
        }
        catch (error) { 
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }
     
    /********************************************************
     Purpose: added favourites
     Parameter:
     {
            "userId": 1,
            "chefId": 1,
            "dishId": 1,
     }
     Return: JSON String
     ********************************************************/
    async addFavourites(){
        try {
          
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let setObject = {}
               
            if(this.req.body.type == 'favourite')
            {
                    this.req.body.userId ? (setObject.userId = this.req.body.userId) : delete setObject.userId;
                    this.req.body.dishId ? (setObject.dishId = this.req.body.dishId) : delete setObject.dishId;
                    this.req.body.chefId ? (setObject.chefId = this.req.body.chefId) : delete setObject.chefId;

                    let whereCondition = {}
                    if(this.req.body.chefId)
                    {
                            whereCondition = {userId:this.req.body.userId,chefId:this.req.body.chefId}
                    }
                    else if(this.req.body.dishId)
                    {
                            whereCondition = {userId:this.req.body.userId,dishId:this.req.body.dishId}
                    }
                    
                    let favourite = await Favourites.findOne({where:whereCondition})
                   
                    if(!favourite)
                    {
                        await Favourites.create(setObject);
                    }

                   
                    return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.FAVORITE_SUCCESS});
            }
            else if(this.req.body.type == 'unfavourite')
            {
              
                let whereCondition = {}
                if(this.req.body.chefId)
                {
                        whereCondition = {userId:this.req.body.userId,chefId:this.req.body.chefId}
                }
                else if(this.req.body.dishId)
                {
                        whereCondition = {userId:this.req.body.userId,dishId:this.req.body.dishId}
                }
                await Favourites.destroy({where:whereCondition});
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.FAVORITE_UNSUCCESS});
   
            }
            
              
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

}
module.exports = FavouritesController;