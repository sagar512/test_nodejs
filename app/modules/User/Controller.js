const _ = require("lodash");
const i18n = require("i18n");

const Controller = require("../Base/Controller");
const Users = require('./Schema').Users;
const Email = require('../../services/Email');
const Model = require("../Base/Model");
const userProjection = require('../User/Projection')
const Globals = require("../../../configs/Globals");
const Config = require("../../../configs/configs");
const RequestBody = require("../../services/RequestBody");
const Authentication = require('../Authentication/Schema').Authtokens;
const CommonService = require("../../services/Common");
const Form = require("../../services/Form");
const File = require("../../services/File");
const exportLib = require('../../../lib/Exports');
let Sms = require("../../services/Sms");
const { response } = require("express");
const { distance } = require("jimp");
const { round, result } = require("lodash");
const Address = require('../ManageAddress/Schema').Address;
const RatingDish = require('../Dish/Schema').RatingDish;
const Dish = require('../Dish/Schema').Dish;
const Cuisine = require('../Cuisine/Schema').Cuisine;
const Preference = require('../Preference/Schema').Preference;
const Category = require('../Category/Schema').Category;
const Order = require('../Order/Schema').Order;
const OrderDetails = require('../Order/Schema').OrderDetails;
const Attribute = require('../Dish/Schema').Attribute;
const Favourites = require('../Favourite/Schema').Favourites;
const complementsTypeSchema = require('./Schema').UserComplementsType;
const BannerSchema = require('../Benner/Schema').Banner;

const Stripe = require('../../services/Strip');

const config = require('../../../configs/configs');

class UsersController extends Controller {
    constructor() {
        super();
    }




    addMinutes(minutes) {
        var date = new Date();
        return date.getTime() + minutes * 60000;
    }

    getNextPage(page, limit, total) {
        //var page = Number(page),
        let limits = Number(limit),
            counts = Number(total);
        var divide = counts / limits;
        var lastPage = Math.ceil(divide);
        // if (page < lastPage) return page + 1;
        //return 0;
        return lastPage
    }

    /********************************************************
     Purpose: user register
        Parameter:
            {
                "email":"john@doe.com",
                "password":"john",
                "mobile":"987654321",
                "countryCode":"+91"
                "name":"john",
            }
    Return: JSON String
   ********************************************************/
    async register() {
        try {

            if (!_.isEmpty(this.req.body.socialId) && !_.isEmpty(this.req.body.type)) {
                let socialId = this.req.body.socialId
                let type = this.req.body.type
                await this.socialRegister(socialId, type)
            } else {
                let fieldsArray = ["emailId", "firstName", "lastName", "password", "mobile", "countryCode", "deviceToken", "deviceType", "city",
                    "state",
                    "country",
                    "addressOne",
                    "addressTwo",
                    "zipcode",
                    "latitude",
                    "longitude"
                ];
                if (_.isEmpty(this.req.body.emailId)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.EMAIL_ID });
                }
                if (_.isEmpty(this.req.body.firstName)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.NAME });
                }
                if (_.isEmpty(this.req.body.mobile)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.MOBILE });
                }
                if (_.isEmpty(this.req.body.countryCode)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.COUNTRY_CODE });
                }

                // check emailId is exist or not
                let filter = { "mobile": this.req.body.mobile, 'countryCode': this.req.body.countryCode, role: 'Customer' , accountDeactivated: false }
                const checkMobile = await Users.findOne({ where: filter });

                let email = this.req.body.emailId
                let filters = { "emailId": email.toLowerCase(), role: 'Customer' }
                const checkEmailId = await Users.findOne({ where: filters });


                if (checkMobile) {

                    return exportLib.Error.handleError(this.res, { status: false, code: 'CONFLICT', message: exportLib.ResponseEn.DUPLICATE_MOBILE });
                    //return this.res.send({ status: 0, message: i18n.__('DUPLICATE_MOBILE') });

                } else if (checkEmailId) {

                    return exportLib.Error.handleError(this.res, { status: false, code: 'CONFLICT', message: exportLib.ResponseEn.DUPLICATE_EMAIL });
                } else {

                    let data = await (new RequestBody()).processRequestBody(this.req.body, fieldsArray);

                    let isPasswordValid = await (new CommonService()).validatePassword({ password: data['password'] });
                    if (isPasswordValid && !isPasswordValid.status) {
                        return exportLib.Response.handleResponse(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', messageEn: isPasswordValid.messageEn, messageAr: isPasswordValid.messageAr, data: {} });
                    }
                    let password = await (new CommonService()).ecryptPassword({ password: data['password'] });

                    let OTP = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                    let expire = this.addMinutes(15)

                    data = {...data, password: password, role: 'user', verificationCode: OTP, expireVerificationCode: expire, deviceToken: this.req.body.deviceToken, deviceType: this.req.body.deviceType };
                    data['emailId'] = data['emailId'].toLowerCase();
                    // save new user
                    data['role'] = 'customer'
                    let uniqueNumber = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                    let latitude = Number(data["latitude"])
                    let longitude = Number(data["longitude"])
                    data['uniqueId'] = 'FJCU-' + uniqueNumber
                    data['addressPoint'] = {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }

                    const newUserId = await Users.create(data);

                    //address mapping in address table
                    let addChefAddress = {
                        userId: newUserId.id,
                        firstName: newUserId.firstName,
                        addressOne: newUserId.addressOne,
                        addressTwo: newUserId.addressTwo,
                        country: newUserId.country,
                        state: newUserId.state,
                        city: newUserId.city,
                        zipcode: newUserId.zipcode,
                        countryCode: newUserId.countryCode,
                        mobile: newUserId.mobile,
                        addressType: 'Work',
                        primaryAddressStatus: true,
                        longitude: newUserId.longitude,
                        latitude: newUserId.latitude,
                        addressPoint: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        }
                    }
                    await Address.create(addChefAddress);

                    let setObject = {
                        "isVerified": newUserId.isVerified,
                        "userId": newUserId.id,
                        "uniqueId": newUserId.uniqueId,
                        "emailId": newUserId.emailId,
                        "firstName": newUserId.firstName,
                        "lastName": newUserId.lastName,
                        "mobile": newUserId.mobile,
                        "countryCode": newUserId.countryCode,
                        "verificationCode": newUserId.verificationCode.toString(),
                        city: newUserId && newUserId.city ? newUserId.city : '',
                        state: newUserId && newUserId.state ? newUserId.state : '',
                        country: newUserId && newUserId.country ? newUserId.country : '',
                    }

                    //register stripe payment gateway 
                    let stripe = await new Stripe()
                    let stripeObject = {
                        name: data.firstName + data.lastName,
                        emailId: data.emailId,
                        mobile: data.countryCode + data.mobile
                    }
                    let stripeCustomer = await stripe.createCustomer(stripeObject)
                    let stripeRequest = {
                        stripeCustomerId: stripeCustomer.id
                    }
                    await Users.update(stripeRequest, { where: { id: newUserId.id } });

                    exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.REGISTRATION_SCUCCESS, data: setObject });
                    //sending message for OTP
                     let smsObj = new Sms();
                     await smsObj.sendOtp(this.req.body.mobile,newUserId.id,this.req.body.countryCode,newUserId.verificationCode);

                    // generate token for email verification
                    let token = await new Globals().generateToken({ id: newUserId.id });
                    // sending mail to verify user
                    let emailData = {
                        emailId: this.req.body.emailId,
                        emailKey: 'user_verification_mail',
                        replaceDataObj: { fullName: `${newUserId.firstName} ${newUserId.lastName}`, verificationLink: Config.verificationUrl + '?token=' + token }
                    };
                    await new Email().sendMail(emailData);
                    await Users.update({ verificationToken: token, verificationTokenCreationTime: new Date() }, { where: { id: newUserId.id } });
                }
            }

        } catch (error) {
            console.log("error = ", error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
    Purpose: Forgot password mail
    Parameter:
        {
            "emailId":"john@doe.com"
        }
    Return: JSON String
   ********************************************************/
    async forgotPassword() {
        try {
            if (_.isEmpty(this.req.body.countryCode)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.COUNTRY_CODE });
            }
            if (!this.req.body.mobile) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.MOBILE });
            }
            let mobile = this.req.body.mobile;
            let user = await Users.findOne({ where: { mobile: mobile, countryCode: this.req.body.countryCode, role: 'Customer' ,  accountDeactivated: false  } });
            if (_.isEmpty(user)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
            }
            let timestamp = Date.now();
            let otpObject = {};
            var OTP = _.floor(100000 + _.random(0.1,  1.0) * 900000);
            otpObject.verificationCode = OTP;
            //otpObject.updatedAt = timestamp;
            //otpObject.createdAt = timestamp;
            otpObject.expireVerificationCode = this.addMinutes(15);
            otpObject.verificationType = 'ForgotPassword'
            let query = { where: { "id": user.id, role: 'Customer' } }
            await Users.update(otpObject, query);
            const newUserId = await Users.findOne(query)
            let setObject = {
                "isVerified": newUserId.isVerified,
                "userId": newUserId.id,
                "emailId": newUserId.emailId,
                "firstName": newUserId.firstName,
                "lastName": newUserId.lastName,
                "mobile": newUserId.mobile,
                countryCode: newUserId.countryCode,
                "verificationCode": OTP.toString()
            }

            exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.FORGOT_SUCCESS, data: setObject });
            let smsObj = new Sms();
            await smsObj.sendOtp(this.req.body.mobile,newUserId.id,this.req.body.countryCode,otpObject.verificationCode);





        } catch (error) {
            console.log("error- ", error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
    Purpose: Reset password
    Parameter:
        {
            "password":"123456",
            "token": "errrrwqqqsssfdfvfgfdewwwww"
        }
    Return: JSON String
   ********************************************************/
    async resetPassword() {
        try {
            if (!this.req.body.password) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.PASSWORD });
            }
            if (!this.req.body.userId) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }


            let isPasswordValid = await (new CommonService()).validatePassword({ password: this.req.body.password });
            if (isPasswordValid && !isPasswordValid.status) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: isPasswordValid.messageEn });
            }
            let password = await (new CommonService()).ecryptPassword({ password: this.req.body.password });

            await Users.update({ password: password }, { where: { id: this.req.body.userId } });

            return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.PASSWORD_UPDATED_SUCCESSFULLY });

        } catch (error) {
            console.log("error- ", error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
    Purpose: Login
    Parameter:
        {
            "emailId":"john@doe.com"
            "password":"123456",
            "deviceToken": "",
            "device": "ios"
        }
    Return: JSON String
   ********************************************************/
    async login() {
            try {
                if (_.isEmpty(this.req.body.emailOrMobile)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.EMAILIDORMOBILE });
                }
                if (_.isEmpty(this.req.body.password)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.PASSWORD });
                }

                let data = await (new RequestBody()).processRequestBody(this.req.body, ["deviceToken", "deviceType"]);

                let query = {
                    [Op.or]: [
                        { emailId: this.req.body.emailOrMobile }, { mobile: this.req.body.emailOrMobile }
                    ],
                    role: 'Customer', 
                    accountDeactivated: false,
                }


                let user = await Users.findOne({ where: query });
                if (_.isEmpty(user)) {
                    return exportLib.Error.handleError(this.res, { status: true, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
                } else {
                    if(user.dataValues.accountDeactivated){
                        return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.ACCOUNT_DEACTIVATE_MSG })
                    }
                    let status = await (new CommonService()).verifyPassword({ password: this.req.body.password, savedPassword: user.password });

                    //this condition for password verify for database
                    if (status == false) {
                        return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_ACCEPTABLE', message: exportLib.ResponseEn.INVALID_PASSWORD });
                    }
                    //check this condition for admin delete the account for customer                
                    if (user && user.isVerified == false) {
                        let timestamp = Date.now();
                        let otpObject = {};
                        let querys = { "id": user.id }
                        var otpdata = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                        otpObject.verificationCode = otpdata;
                        //otpObject.updatedAt = timestamp;
                        //otpObject.createdAt = timestamp;
                        otpObject.deviceToken = this.req.body.deviceToken
                        otpObject.deviceType = this.req.body.device
                        otpObject.expireVerificationCode = this.addMinutes(15);
                        await Users.update(otpObject, { where: querys });
                        let newUserId = await Users.findOne({ where: querys });

                        let setObject = {
                            "isVerified": newUserId.isVerified,
                            isEmailVerified: newUserId.isEmailVerified,
                            "userId": newUserId.id,
                            "emailId": newUserId.emailId,
                            "firstName": newUserId.firstName,
                            "lastName": newUserId.lastName,
                            "mobile": newUserId.mobile,
                            "countryCode": newUserId.countryCode,
                            uniqueId: newUserId.uniqueId,
                            "verificationCode": otpdata.toString(),
                            city: newUserId && newUserId.city ? newUserId.city : '',
                            state: newUserId && newUserId.state ? newUserId.state : '',
                            country: newUserId && newUserId.country ? newUserId.country : '',
                            photo: newUserId && newUserId.photo ? newUserId.photo : '',
                        }

                        exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.VERIFY_MOBILE, data: setObject });
                           let smsObj = new Sms();
                           await smsObj.sendOtp(newUserId.mobile,newUserId.id, newUserId.countryCode,otpdata);
                    } else if (user && user.isVerified == true) {

                        data['lastSeen'] = new Date();
                        data['deviceToken'] = this.req.body.deviceToken
                        data['deviceType'] = this.req.body.device
                        await Users.update(data, { where: { id: user.id } })

                        let token = await new Globals().getToken({ id: user.id });



                        let setObject = {
                            userId: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            isVerified: user.isVerified,
                            isEmailVerified: user.isEmailVerified,
                            emailId: user.emailId,
                            city: user.city ? user.city : '',
                            photo: user.photo ? user.photo : '',
                            mobile: user.mobile,
                            countryCode: user.countryCode,
                            state: user.state ? user.state : '',
                            country: user.country ? user.country : '',
                            uniqueId: user.uniqueId,
                            stripeCustomerId: user.stripeCustomerId
                        }

                        return exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.LOGIN_SUCCESS, data: setObject }, token);
                    }


                }



            } catch (error) {
                console.log(error, 'error in login')
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });

            }
        }
        /********************************************************
    Purpose: Change Password
    Parameter:
        {
            "oldPassword":"password",
            "newPassword":"newpassword"
        }
    Return: JSON String
   ********************************************************/
    async changePassword() {
        try {
            const user = await (new Globals()).checkUserInDB(this.req.headers.authorization);
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            if (!this.req.body.oldPassword || !this.req.body.newPassword) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.SEND_PROPER_DATA });
            }

            if (_.isEmpty(user)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
            }

            const samePassword = _.isEqual(this.req.body.oldPassword, this.req.body.newPassword);
            if (samePassword) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.OLD_PASSWORD_NEW_PASSWORD_DIFFERENT });
            }

            const status = await (new CommonService()).verifyPassword({ password: this.req.body.oldPassword, savedPassword: user.password });

            if (!status) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.CORRECT_CURRENT_PASSWORD });

            }

            // let passwordData = {
            //     password: this.req.body.newPassword,
            //     userObj: user
            // };
            // let isPasswordValid = await (new CommonService()).validatePassword(passwordData);

            // if (isPasswordValid && !isPasswordValid.status) {
            //     return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: isPasswordValid.messageEn });
            // }
            let password = await (new CommonService()).ecryptPassword({ password: this.req.body.newPassword });

            let updateData = { password: password };
            // if (Config.storePreviouslyUsedPasswords) {
            //     updateData = { password: password};
            // }

            await Users.update(updateData, { where: { id: user.id } });

            return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.PASSWORD_UPDATED_SUCCESSFULLY });

        } catch (error) {
            console.log("error- ", error);
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
      Purpose: Edit profile
      Parameter:
          {
              "firstname": "firstname",
              "lastname": "lastname",
              "username": "username",
              "photo": "photo"
          }
      Return: JSON String
     ********************************************************/
    async editUserProfile() {
        try {

            if (!this.req.body.userId) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let userOld = await Users.findOne({ where: { id: this.req.body.userId } })
            let userNew = {};
            //            const file = await  (new File(this.req.file)).generateThumbnail();
            //console.log(this.req.file,'this.req.file')
            if (this.req.file) {
                const files = await (new File(this.req.file)).fileUploadAzure();

                let setObject = {};
                this.req.body.firstName ? (setObject.firstName = this.req.body.firstName) : delete setObject.firstName;
                this.req.body.lastName ? (setObject.lastName = this.req.body.lastName) : delete setObject.lastName;
                this.req.body.emailId ? (setObject.emailId = this.req.body.emailId) : delete setObject.emailId;
                // this.req.body.city ? (setObject.city = this.req.body.city) : delete setObject.city;
                // this.req.body.addressOne ? (setObject.addressOne = this.req.body.addressOne) : delete setObject.addressOne;
                // this.req.body.addressTwo ? (setObject.addressTwo = this.req.body.addressTwo) : delete setObject.addressTwo;
                // this.req.body.country ? (setObject.country = this.req.body.country) : delete setObject.country;
                // this.req.body.zipcode ? (setObject.zipcode = this.req.body.zipcode) : delete setObject.zipcode;
                // this.req.body.photo ? (setObject.photo =  this.req.body.photo) : delete setObject.photo;
                // this.req.body.mobile ? (setObject.mobile =  this.req.body.mobile) : delete setObject.mobile;
                // this.req.body.countryCode ? (setObject.countryCode =  this.req.body.countryCode) : delete setObject.countryCode;

                // this.req.body.latitude ? (setObject.latitude =  this.req.body.latitude) : delete setObject.latitude;
                // this.req.body.longitude ? (setObject.longitude =  this.req.body.longitude) : delete setObject.longitude;

                // let latitude = Number(this.req.body.latitude)
                // let longitude = Number(this.req.body.longitude)
                // setObject.point = {
                //     type: 'Point',
                //     coordinates: [latitude, longitude]
                let checkUserId = await Users.findOne({ where: { emailId: userOld.emailId, id: this.req.body.userId, role: 'Customer' } });
                if (checkUserId) {
                    setObject.photo = files.name

                    var query = { where: { "id": this.req.body.userId } }

                    await Users.update(setObject, query);
                    let users = await Users.findOne(query)
                    userNew = users;

                    let updatedUser = {
                        userId: users.id,
                        firstName: users.firstName,
                        lastName: users.lastName,
                        emailId: users.emailId,
                        mobile: users.mobile,
                        countryCode: users.countryCode,
                        photo: users.photo,
                        uniqueId: users.uniqueId,
                        city: users && users.city ? users.city : '',
                        country: users && users.country ? users.country : '',
                        state: users && users.state ? users.state : '',
                        zipcode: users && users.zipcode ? users.zipcode : '',
                        isVerified: users.isVerified,

                    }


                    exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.USER_UPDATED_SUCCESSFULLY, data: updatedUser });
                    if (userOld.emailId != userNew.emailId) {
                        // generate token for email verification
                        let token = await new Globals().generateToken({ id: userOld.id });
                        // sending mail to verify user
                        let emailData = {
                            emailId: userNew.emailId,
                            emailKey: 'user_verification_mail',
                            replaceDataObj: { fullName: `${userNew.firstName} ${userNew.lastName}`, verificationLink: Config.verificationUrl + '?token=' + token }
                        };
                        await new Email().sendMail(emailData);
                        await userOld.update({ isEmailVerified: false, verificationToken: token, verificationTokenCreationTime: new Date() });
                    }

                } else {
                    // }
                    let findAnUserForUpdate = await Users.findOne({ where: { emailId: userOld.emailId, role: 'Customer' } });
                    if (!_.isEmpty(findAnUserForUpdate)) {
                        return exportLib.Error.handleError(this.res, {
                            status: false,
                            code: 'CONFLICT',
                            message: exportLib.ResponseEn.ALREADY_EMAIL_USER,

                        });
                    }

                    setObject.photo = files.name

                    var queryWhere = { where: { "id": this.req.body.userId } }

                    await Users.update(setObject, queryWhere);
                    let users = await Users.findOne(queryWhere)
                    userNew = users;

                    let updatedUser = {
                        userId: users.id,
                        firstName: users.firstName,
                        lastName: users.lastName,
                        emailId: users.emailId,
                        mobile: users.mobile,
                        countryCode: users.countryCode,
                        photo: users.photo,
                        uniqueId: users.uniqueId,
                        city: users && users.city ? users.city : '',
                        country: users && users.country ? users.country : '',
                        state: users && users.state ? users.state : '',
                        zipcode: users && users.zipcode ? users.zipcode : '',
                        isVerified: users.isVerified,

                    }


                    exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.USER_UPDATED_SUCCESSFULLY, data: updatedUser });
                    if (userOld.emailId != userNew.emailId) {
                        // generate token for email verification
                        let token = await new Globals().generateToken({ id: userOld.id });
                        // sending mail to verify user
                        let emailData = {
                            emailId: userNew.emailId,
                            emailKey: 'user_verification_mail',
                            replaceDataObj: { fullName: `${userNew.firstName} ${userNew.lastName}`, verificationLink: Config.verificationUrl + '?token=' + token }
                        };
                        await new Email().sendMail(emailData);
                        await userOld.update({ isEmailVerified: false, verificationToken: token, verificationTokenCreationTime: new Date() });
                    }
                }

            } else {
                let setObject = {};
                this.req.body.firstName ? (setObject.firstName = this.req.body.firstName) : delete setObject.firstName;
                this.req.body.lastName ? (setObject.lastName = this.req.body.lastName) : delete setObject.lastName;
                this.req.body.emailId ? (setObject.emailId = this.req.body.emailId) : delete setObject.emailId;
                // this.req.body.city ? (setObject.city = this.req.body.city) : delete setObject.city;
                // this.req.body.addressOne ? (setObject.addressOne = this.req.body.addressOne) : delete setObject.addressOne;
                // this.req.body.addressTwo ? (setObject.addressTwo = this.req.body.addressTwo) : delete setObject.addressTwo;
                // this.req.body.country ? (setObject.country = this.req.body.country) : delete setObject.country;
                // this.req.body.zipcode ? (setObject.zipcode = this.req.body.zipcode) : delete setObject.zipcode;
                // this.req.body.photo ? (setObject.photo =  this.req.body.photo) : delete setObject.photo;
                // this.req.body.mobile ? (setObject.mobile =  this.req.body.mobile) : delete setObject.mobile;
                // this.req.body.countryCode ? (setObject.countryCode =  this.req.body.countryCode) : delete setObject.countryCode;

                // this.req.body.latitude ? (setObject.latitude =  this.req.body.latitude) : delete setObject.latitude;
                // this.req.body.longitude ? (setObject.longitude =  this.req.body.longitude) : delete setObject.longitude;

                // let latitude = Number(this.req.body.latitude)
                // let longitude = Number(this.req.body.longitude)
                // setObject.point = {
                //     type: 'Point',
                //     coordinates: [latitude, longitude]
                // }

                let checkUserId = await Users.findOne({ where: { emailId: this.req.body.emailId, id: this.req.body.userId, role: 'Customer' } });
                if (checkUserId) {
                    var mainQuery = { where: { "id": this.req.body.userId } }
                    console.log('testing')
                    await Users.update(setObject, mainQuery);
                    let usersInfo = await Users.findOne(mainQuery)
                        //userNew = users;

                    let updatedUserInfo = {
                        userId: usersInfo.id,
                        firstName: usersInfo.firstName,
                        lastName: usersInfo.lastName,
                        emailId: usersInfo.emailId,
                        mobile: usersInfo.mobile,
                        countryCode: usersInfo.countryCode,
                        photo: usersInfo.photo,
                        uniqueId: usersInfo.uniqueId,
                        city: usersInfo && usersInfo.city ? usersInfo.city : '',
                        country: usersInfo && usersInfo.country ? usersInfo.country : '',
                        state: usersInfo && usersInfo.state ? usersInfo.state : '',
                        zipcode: usersInfo && usersInfo.zipcode ? usersInfo.zipcode : '',
                        isVerified: usersInfo.isVerified,

                    }


                    exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.USER_UPDATED_SUCCESSFULLY, data: updatedUserInfo });
                    // if (userOld.emailId != userNew.emailId) {
                    //     // generate token for email verification
                    //     let token = await new Globals().generateToken({ id: userOld.id });
                    //     // sending mail to verify user
                    //     let emailData = {
                    //         emailId: userNew.emailId,
                    //         emailKey: 'user_verification_mail',
                    //         replaceDataObj: { fullName: `${userNew.firstName} ${userNew.lastName}`, verificationLink: Config.verificationUrl + '?token=' + token }
                    //     };
                    //     await new Email().sendMail(emailData);
                    //     await userOld.update({ isEmailVerified: false, verificationToken: token, verificationTokenCreationTime: new Date() });
                    // }

                } else {

                    let findAnUserForUpdate = await Users.findOne({ where: { emailId: this.req.body.emailId, role: 'Customer' } });
                    if (!_.isEmpty(findAnUserForUpdate)) {
                        return exportLib.Error.handleError(this.res, {
                            status: false,
                            code: 'CONFLICT',
                            message: exportLib.ResponseEn.ALREADY_EMAIL_USER,

                        });
                    }
                }


                var mainQueryCond = { where: { "id": this.req.body.userId } }
                console.log('testing')
                await Users.update(setObject, mainQueryCond);
                let users = await Users.findOne(mainQueryCond)
                userNew = users;

                let updatedUser = {
                    userId: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    emailId: users.emailId,
                    mobile: users.mobile,
                    countryCode: users.countryCode,
                    photo: users.photo,
                    uniqueId: users.uniqueId,
                    city: users && users.city ? users.city : '',
                    country: users && users.country ? users.country : '',
                    state: users && users.state ? users.state : '',
                    zipcode: users && users.zipcode ? users.zipcode : '',
                    isVerified: users.isVerified,

                }


                exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.USER_UPDATED_SUCCESSFULLY, data: updatedUser });
                if (userOld.emailId != userNew.emailId) {
                    // generate token for email verification
                    let token = await new Globals().generateToken({ id: userOld.id });
                    // sending mail to verify user
                    let emailData = {
                        emailId: userNew.emailId,
                        emailKey: 'user_verification_mail',
                        replaceDataObj: { fullName: `${userNew.firstName} ${userNew.lastName}`, verificationLink: Config.verificationUrl + '?token=' + token }
                    };
                    await new Email().sendMail(emailData);
                    await userOld.update({ isEmailVerified: false, verificationToken: token, verificationTokenCreationTime: new Date() });
                }



            }



        } catch (error) {
            console.log("error = ", error);
            this.res.send({
                settings: {
                    status: false,
                    code: 500,
                    messageEn: error,
                    messageAr: error
                },
                data: {}
            });
        }
    }

    /********************************************************
     Purpose: user details
     Parameter:
     {
        "uid": "5ad5d198f657ca54cfe39ba0"
     }
     Return: JSON String
     ********************************************************/
    async userProfile() {
        try {
            const requestParams = this.req.currentUser;
            //const currentUser = this.req.currentUser && this.req.currentUser.id ? this.req.currentUser._id : "";
            //let user = await Users.findOne({ _id: currentUser }, userProjection.user);
            //let user = await Users.findOne({ id: currentUser }, userProjection.user);
            let user = await Users.findOne({ where: { id: requestParams.dataValues.id } });
            let setObject = {
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                isVerified: user.isVerified,
                isEmailVerified: user.isEmailVerified,
                emailId: user.emailId,
                city: user && user.city ? user.city : '',
                photo: user && user.photo ? user.photo : '',
                mobile: user.mobile,
                countryCode: user.countryCode,
                state: user && user.state ? user.state : '',
                country: user && user.country ? user.country : '',
                zipcode: user && user.zipcode ? user.zipcode : '',
                uniqueId: user.uniqueId,
            }

            return _.isEmpty(user) ? exportLib.Error.handleError(this.res, { status: true, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST }) : exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.LOGIN_SUCCESS, data: setObject });
        } catch (error) {
            console.log("error- ", error);
            this.res.send({ status: 0, message: error });
        }
    }

    /********************************************************
     Purpose: verified user
     Parameter:
     {
        token:""
     }
     Return: JSON String
     ********************************************************/
    async verifyUser() {
        try {
            let reqQuery = this.req.query;

            let user = await Users.findOne({ where: { verificationToken: reqQuery.token } });
            if (_.isEmpty(user)) {
                return this.res.send({ status: 0, message: i18n.__("INVALID_TOKEN") });
            }

            let decoded = await Globals.decodeUserVerificationToken(reqQuery.token);
            if (!decoded) {
                return this.res.send({ status: 0, message: i18n.__("LINK_EXPIRED") });
            }

            await user.update({ isEmailVerified: true });

            return this.res.send({ status: 1, message: i18n.__("USER_VERIFIED") });
        } catch (error) {
            console.log("error ", error);
            return this.res.send({ status: 0, message: i18n.__("SERVER_ERROR") });
        }
    }

    /********************************************************
     Purpose: Logout User
     Parameter:
     {}
     Return: JSON String
     ********************************************************/
    async logout() {
        try {
            const currentUser = this.req.currentUser ? this.req.currentUser : {};
            if (currentUser && currentUser.dataValues.id) {
                let params = { token: null };
                let filter = { userId: currentUser.dataValues.id };
                await Authentication.update(params, { where: filter });
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.LOGOUT_SUCCESS })
            } else {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
            }

        } catch (error) {
            console.log('error', error);
            this.res.send({ status: 0, message: error });
        }

    }

    /********************************************************
     Purpose: Refresh AccessToken
     Parameter:
     {}
     Return: JSON String
     ********************************************************/
    async refreshAccessToken() {
        try {
            if (!this.req.headers.refreshtoken) {
                return this.res.send({ status: 0, message: i18n.__("SEND_PROPER_DATA") });
            }
            let token = await (new Globals()).refreshAccessToken(this.req.headers.refreshtoken);
            return this.res.send(token);
        } catch (error) {
            console.log("error = ", error);
            this.res.send({ status: 0, message: i18n.__("SERVER_ERROR") });
        }
    }

    /********************************************************
    Purpose: Single File uploading
    Parameter:
    {
           "file":
    }
    Return: JSON String
    ********************************************************/
    async fileUpload() {
            try {

                // console.log(this.req.file,'file')

                const file = await (new File(this.req.file)).generateThumbnail();
                const files = await (new File(this.req.file)).fileUploadAzure();

                //console.log(files,'file uploaded');
                let responses = {
                    fileUrl: files.name,
                    thumbnailUrl: file.name
                }
                return exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.LOGOUT_SUCCESS, data: responses })

            } catch (error) {
                console.log("error- ", error);
                exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.PASSWORD_UPDATED_SUCCESSFULLY });
            }

        }
        /********************************************************
    Purpose: Verifiy OTP
    Parameter:
    {
           "verificationCode":""
    }
    Return: JSON String
    ********************************************************/
    async verifyOTP() {
            try {
                if (!this.req.body.userId) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
                }
                var verificationCode = this.req.body.verificationCode;

                var timestamp = Date.now();
                // let token = globalMethods.getToken(req.body.userId);
                let userDetail = await Users.findOne({ where: { "id": this.req.body.userId, role: 'Customer' } });
                if (_.isEmpty(userDetail)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
                }
                var otpData = userDetail;
                //check the verification code 
                if (otpData.verificationCode != verificationCode) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_ACCEPTABLE', message: exportLib.ResponseEn.INVALID_OTP });
                }
                var expiredDate = otpData.expireVerificationCode;

                if (timestamp > expiredDate) {
                    console.log(expiredDate)
                    return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_ACCEPTABLE', message: exportLib.ResponseEn.OTP_EXPIRES });
                }
                // var completeProfile;
                // if(otpData.firstName != '' && otpData.lastName != '' && otpData.firstName && otpData.lastName){ console.log(otpData.firstName),completeProfile = true }else{console.log(otpData.firstName),completeProfile = false}
                await Users.update({ isVerified: true }, { where: { "id": otpData.id } })
                var userData = {
                    deviceToken: this.req.body.deviceToken,
                    deviceType: this.req.body.deviceType,
                    id: this.req.body.userId
                }
                if (otpData.verificationType == 'ForgotPassword') {

                    await Users.update({ verificationType: "" }, { where: { "id": otpData.id } })
                    otpData = await Users.findOne({ where: { "id": this.req.body.userId, role: 'Customer' } })
                    var data = {
                        "userId": otpData.id,
                        "mobile": otpData.mobile,
                        "countryCode": otpData.countryCode,
                        "firstName": otpData.firstName,
                        "lastName": otpData.lastName,
                        "emailId": otpData.emailId,
                        isVerified: otpData.isVerified,
                        isEmailVerified: otpData.isEmailVerified,
                        photo: otpData && otpData.photo ? otpData.photo : '',
                        city: otpData && otpData.city ? otpData.city : '',
                        state: otpData && otpData.state ? otpData.state : '',
                        country: otpData && otpData.country ? otpData.country : '',
                        uniqueId: otpData.uniqueId

                    }
                    return exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', messageEn: exportLib.ResponseEn.VERIFICATION_SUCCESS, data: data })

                }
                if (otpData.verificationType == 'ChangedMobile') {

                    await Users.update({ verificationType: "", mobile: otpData.temporaryMobile, temporaryMobile: "", countryCode: otpData.temporaryCountryCode, temporaryCountryCode: "" }, { where: { "id": otpData.id } })
                    otpData = await Users.findOne({ where: { "id": this.req.body.userId, role: 'Customer' } })
                    var setData = {
                        "userId": otpData.id,
                        "mobile": otpData.mobile,
                        "countryCode": otpData.countryCode,
                        "firstName": otpData.firstName,
                        "lastName": otpData.lastName,
                        "emailId": otpData.emailId,
                        isVerified: otpData.isVerified,
                        isEmailVerified: otpData.isEmailVerified,
                        photo: otpData && otpData.photo ? otpData.photo : '',
                        city: otpData && otpData.city ? otpData.city : '',
                        state: otpData && otpData.state ? otpData.state : '',
                        country: otpData && otpData.country ? otpData.country : '',
                        uniqueId: otpData.uniqueId

                    }
                    return exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', messageEn: exportLib.ResponseEn.MOBILE_VERIFICATION_SUCCESS, data: setData })

                } else {
                    let globalObj = new Globals();
                    const token = await globalObj.getToken(userData);
                    otpData = await Users.findOne({ where: { "id": this.req.body.userId, role: 'Customer' } });


                    var setDataValues = {
                        "userId": otpData.id,
                        "mobile": otpData.mobile,
                        "countryCode": otpData.countryCode,
                        "firstName": otpData.firstName,
                        "lastName": otpData.lastName,
                        "emailId": otpData.emailId,
                        isVerified: otpData.isVerified,
                        isEmailVerified: otpData.isEmailVerified,
                        photo: otpData && otpData.photo ? otpData.photo : '',
                        city: otpData && otpData.city ? otpData.city : '',
                        state: otpData && otpData.state ? otpData.state : '',
                        stripeCustomerId: otpData.stripeCustomerId,
                        country: otpData && otpData.country ? otpData.country : '',
                        uniqueId: otpData.uniqueId

                    }
                    return exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', messageEn: exportLib.ResponseEn.VERIFICATION_SUCCESS, data: setDataValues }, token)

                }

            } catch (error) {
                console.log("error- ", error);
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
         Purpose: resend otp
         Parameter:
            {
               userId:""

            }
         Return: JSON String
         ********************************************************/
    async resendOTP() {
            let _this = this;
            try {
                if (!_this.req.body.userId) {
                    return exportLib.Response.handleResponse(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', messageEn: exportLib.ResponseEn.VALID_USERID });
                }
                let userDetail = await Users.findOne({ where: { "id": this.req.body.userId, role: 'Customer' } });
                if (_.isEmpty(userDetail)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
                }


                var obj = {};
                var otpdata = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                obj.verificationCode = otpdata
                var timestamp = Date.now();
                //obj.updatedOn = timestamp;
                //obj.createdOn = timestamp;
                //  let smsObj = new Sms();
                obj.expireVerificationCode = this.addMinutes(15);



                await Users.update(obj, { where: { "id": _this.req.body.userId, role: 'Customer' } });

                var otp = {
                    verificationCode: otpdata.toString()
                }

                exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.OTP_RESEND_SUCCESS, data: otp })
                     let smsObj = new Sms();
                     await smsObj.sendOtp(userDetail.mobile,userDetail.id, userDetail.countryCode,otpdata);


            } catch (error) {
                console.log('error =>:', error);
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
        Purpose: Common function for social register
        Parameter:
        {}
        Return: JSON String
        ********************************************************/
    async socialRegister(socialId, type) {
            return new Promise(async(resolve, reject) => {
                try {
                    let storeData = {}
                    let fieldsArray = ["emailId", "firstName", "lastName", "password", "mobile", "countryCode", "deviceToken", "deviceType", "city",
                        "state",
                        "country",
                        "addressOne",
                        "addressTwo",
                        "zipcode",
                        "latitude",
                        "longitude"
                    ];
                    switch (type) {
                        case 'facebook':
                            storeData.fbId = socialId
                            break
                        case 'google':
                            storeData.googleId = socialId
                            break
                        case 'apple':
                            storeData.appleId = socialId
                            break
                    }
                    let email = this.req.body.emailId

                    //checking the social id
                    let query = [storeData, {
                        "emailId": this.req.body.emailId.toLowerCase(),
                        "mobile": this.req.body.mobile,
                        'countryCode': this.req.body.countryCode,
                        role: 'Customer'
                    }]


                    //  console.log(query,'filter')

                    let checkSocialId = await Users.findOne({ where: Sequelize.and(query) })
                    console.log(checkSocialId, 'checksocial')

                    //checking the mobile number 
                    let filter = { "mobile": this.req.body.mobile, 'countryCode': this.req.body.countryCode, role: 'Customer',  accountDeactivated: false  }
                    const checkMobile = await Users.findOne({ where: filter });
                    //  console.log(checkMobile,'checkMobile')
                    //checking the mobile email
                    let filters = { "emailId": email.toLowerCase(), role: 'Customer' }
                    const checkEmailId = await Users.findOne({ where: filters });

                    let socialIds = storeData
                    let checkSocialIds = await Users.findOne({ where: socialIds })

                    // if(checkSocialId)
                    // {
                    //                 if(checkSocialId.isVerified)
                    //                 {
                    //                     let globalObj = new Globals();
                    //                     const token = await globalObj.getToken({id:checkSocialId.id});




                    //                     let responseUpdate = {
                    //                         "userId": checkEmailId.id,
                    //                         "mobile": checkEmailId.mobile,
                    //                         "countryCode": checkEmailId.countryCode,
                    //                         "firstName": checkEmailId.firstName,
                    //                         "emailId": checkEmailId.emailId,
                    //                         "isVerified": checkEmailId.isVerified,
                    //                         isEmailVerified:checkEmailId.isEmailVerified,
                    //                         photo: checkEmailId.photo ? Config.apiUrl +  checkEmailId.photo : '',
                    //                         city:  checkMobile.city ? checkMobile.city : '',
                    //                             uniqueId:checkMobile.uniqueId,
                    //                             city: checkMobile && checkMobile.city ? checkMobile.city : '',
                    //                             state: checkMobile && checkMobile.state ? checkMobile.state : '',
                    //                             country: checkMobile && checkMobile.country ? checkMobile.country : '',

                    //                     }

                    //                     return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.USER_SIGNEDUP_SUCCESSFULLY, data: responseUpdate },token);

                    //                 }
                    //                 else
                    //                 {

                    //                     let timestamp = Date.now();
                    //                     let otpObject = {};
                    //                     let userQuery = { "id":checkSocialId.id}
                    //                     var otpdata = Math.floor(1000 + Math.random() * 900000);
                    //                     otpObject.verificationCode = otpdata;
                    //                     otpObject.updatedAt = timestamp;
                    //                     otpObject.createdAt = timestamp;
                    //                     otpObject.deviceToken = this.req.body.deviceToken
                    //                     otpObject.deviceType = this.req.body.deviceType
                    //                     otpObject.expireVerificationCode = this.addMinutes(15);

                    //                      await (new RequestBody()).processRequestBody(this.req.body, fieldsArray);
                    //                      await Users.update(otpObject,{where:userQuery});
                    //                     const newUserId = await Users.findOne({where:userQuery})

                    //                     let setObject = {
                    //                         "isVerified": newUserId.isVerified,
                    //                         "userId": newUserId.id,
                    //                         "emailId": newUserId.emailId,
                    //                         "firstName": newUserId.firstName,
                    //                         "lastName": newUserId.lastName,
                    //                         "mobile": newUserId.mobile,
                    //                         "countryCode": newUserId.countryCode,
                    //                         "verificationCode": otpdata,
                    //                         city:  newUserId.city ? newUserId.city : '',
                    //                         uniqueId:newUserId.uniqueId,
                    //                         city: newUserId && newUserId.city ? newUserId.city : '',
                    //                         state: newUserId && newUserId.state ? newUserId.state : '',
                    //                         country: newUserId && newUserId.country ? newUserId.country : '',
                    //                     }


                    //                     return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.USER_SIGNEDUP_SUCCESSFULLY, data: setObject });
                                        //  let smsObj = new Sms();
                                        // await smsObj.sendOtp(newUserId.mobile,newUserId._id, newUserId.countryCode,otpdata);


                    //                 }
                    // }
                    if (checkMobile) {




                        return exportLib.Error.handleError(this.res, { status: false, code: 'CONFLICT', message: exportLib.ResponseEn.DUPLICATE_MOBILE });

                    } else if (checkEmailId) {

                        return exportLib.Error.handleError(this.res, { status: false, code: 'CONFLICT', message: exportLib.ResponseEn.DUPLICATE_EMAIL });

                    } else if (checkSocialIds) {
                        return exportLib.Error.handleError(this.res, { status: false, code: 'CONFLICT', message: exportLib.ResponseEn.SOCAIL_CHECK });
                    } else {


                        let data = await (new RequestBody()).processRequestBody(this.req.body, fieldsArray);
                        var otp = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                        let expire = this.addMinutes(15)
                        let uniqueNumber = _.floor(100000 + _.random(0.1,  1.0) * 900000);

                        data['emailId'] = data['emailId'].toLowerCase();
                        data['uniqueId'] = 'FJCU-' + uniqueNumber

                        if (this.req.body.type == 'facebook') { data['fbId'] = this.req.body.socialId } else if (this.req.body.type == 'google') { data['googleId'] = this.req.body.socialId } else if (this.req.body.type == 'apple') { data['appleId'] = this.req.body.socialId }

                        let isPasswordValid = await (new CommonService()).validatePassword({ password: data['password'] });
                        if (isPasswordValid && !isPasswordValid.status) {
                            return exportLib.Response.handleResponse(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', messageEn: isPasswordValid.messageEn, messageAr: isPasswordValid.messageAr, data: {} });
                        }
                        let password = await (new CommonService()).ecryptPassword({ password: data['password'] });



                        data = {...data, role: 'Customer', verificationCode: otp, expireVerificationCode: expire, deviceToken: this.req.body.deviceToken, deviceType: this.req.body.deviceType, password: password };
                        let latitude = Number(data["latitude"])
                        let longitude = Number(data["longitude"])
                        data['addressPoint'] = {
                                type: 'Point',
                                coordinates: [longitude, latitude]
                            }
                            // save new user
                        const newUserId = await Users.create(data);

                        //address mapping in address table
                        let addChefAddress = {
                            userId: newUserId.id,
                            firstName: newUserId.firstName,
                            addressOne: newUserId.addressOne,
                            addressTwo: newUserId.addressTwo,
                            country: newUserId.country,
                            state: newUserId.state,
                            city: newUserId.city,
                            zipcode: newUserId.zipcode,
                            countryCode: newUserId.countryCode,
                            mobile: newUserId.mobile,
                            addressType: 'Work',
                            primaryAddressStatus: true,
                            longitude: newUserId.longitude,
                            latitude: newUserId.latitude,
                            addressPoint: {
                                type: 'Point',
                                coordinates: [longitude, latitude]
                            }
                        }
                        await Address.create(addChefAddress);

                        //register stripe payment gateway 
                        let stripe = await new Stripe()
                        let stripeObject = {
                            name: newUserId.firstName + newUserId.lastName,
                            emailId: newUserId.emailId,
                            mobile: newUserId.countryCode + newUserId.mobile
                        }
                        let stripeCustomer = await stripe.createCustomer(stripeObject)
                        let stripeRequest = {
                            stripeCustomerId: stripeCustomer.id
                        }
                        await Users.update(stripeRequest, { where: { id: newUserId.id } });

                        if (this.req.body.isEmailVerificationRequire == true && this.req.body.emailId) {
                            // generate token for email verification
                            let token = await new Globals().generateToken({ id: newUserId.id });
                            // sending mail to verify user
                            let emailData = {
                                emailId: this.req.body.emailId,
                                emailKey: 'user_verification_mail',
                                replaceDataObj: { fullName: `${newUserId.firstName} ${newUserId.lastName}`, verificationLink: Config.verificationUrl + '?token=' + token }
                            };
                            await new Email().sendMail(emailData);
                            await Users.update({ verificationToken: token, verificationTokenCreationTime: new Date() }, { where: { id: newUserId.id } });

                        } else {

                            await Users.update({ isEmailVerified: true }, { where: { id: newUserId.id } });
                        }


                        let setObject = {
                            "isVerified": newUserId.isVerified,
                            "userId": newUserId.id,
                            "emailId": newUserId.emailId,
                            "firstName": newUserId.firstName,
                            "lastName": newUserId.lastName,
                            "mobile": newUserId.mobile,
                            "countryCode": newUserId.countryCode,
                            "verificationCode": newUserId.verificationCode,
                            uniqueId: newUserId.uniqueId,
                            city: newUserId && newUserId.city ? newUserId.city : '',
                            state: newUserId && newUserId.state ? newUserId.state : '',
                            country: newUserId && newUserId.country ? newUserId.country : '',
                        }

                        exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.USER_SIGNEDUP_SUCCESSFULLY, data: setObject });
                         let smsObj = new Sms();
                        await smsObj.sendOtp(newUserId.mobile,newUserId._id, newUserId.countryCode,newUserId.verificationCode);

                    }


                } catch (error) {
                    console.log('error =>', error)
                    return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: typeof error == 'string' ? error : 'INTERNAL_SERVER_ERROR' });
                }
            });
        }
        /********************************************************
         Purpose: checkSocial
         Parameter:
            {
               userId:""

            }
         Return: JSON String
         ********************************************************/

    async checkSocial() {

            try {
                if (_.isEmpty(this.req.body.socialId)) {
                    return exportLib.Response.handleResponse(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', messageEn: exportLib.ResponseEn.VALID_SOCIAL, messageAr: exportLib.ResponseAr.VALID_SOCIAL, data: {} });
                }
                if (_.isEmpty(this.req.body.type)) {
                    return exportLib.Response.handleResponse(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', messageEn: exportLib.ResponseEn.VALID_TYPE, messageAr: exportLib.ResponseAr.VALID_TYPE, data: {} });
                }
                if (!_.isEmpty(this.req.body.socialId) && !_.isEmpty(this.req.body.type)) {
                    let query
                    let socialId = this.req.body.socialId
                    let type = this.req.body.type
                    var user
                    if (type == 'facebook') {

                        if (socialId) {
                            query = { fbId: socialId }
                            user = await Users.findOne({ where: query });
                        } else if (!_.isEmpty(this.req.body.emailId) && _.isEmpty(user)) {
                            query = { emailId: this.req.body.emailId }
                            user = await Users.findOne({ where: query });
                        }

                    } else if (type == 'google') {
                        if (socialId) {
                            query = { googleId: socialId }
                            user = await Users.findOne({ where: query });
                        } else if (!_.isEmpty(this.req.body.emailId) && _.isEmpty(user)) {
                            query = { emailId: this.req.body.emailId }
                            user = await Users.findOne({ where: query });
                        }


                    } else if (type == 'apple') {

                        if (socialId) {
                            query = { appleId: socialId }
                            user = await Users.findOne({ where: query });
                        } else if (!_.isEmpty(this.req.body.emailId) && _.isEmpty(user)) {
                            query = { emailId: this.req.body.emailId }
                            user = await Users.findOne({ where: query });
                        }

                    }

                    if (_.isEmpty(user)) {
                        return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
                    }
                    if (!_.isEmpty(user)) {
                        if (user.isVerified == false) {
                            let timestamp = Date.now();
                            let otpObject = {};
                            let orQuery = { "id": user.id }
                            var otpdata = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                            otpObject.verificationCode = otpdata;
                            // otpObject.updatedAt = timestamp;
                            //otpObject.createdAt = timestamp;
                            otpObject.deviceToken = this.req.body.deviceToken
                            otpObject.deviceType = this.req.body.device
                            otpObject.expireVerificationCode = this.addMinutes(15);
                            if (type == 'facebook') { otpObject['fbId'] = socialId }
                            if (type == 'google') { otpObject['googleId'] = socialId }
                            if (type == 'apple') { otpObject['appleId'] = socialId }
                            await Users.update(otpObject, { where: orQuery });
                            const newUserId = await Users.findOne({ where: orQuery })
                            let setObject = {
                                "isVerified": newUserId.isVerified,
                                "userId": newUserId.id,
                                "emailId": newUserId.emailId,
                                "firstName": newUserId.firstName,
                                "lastName": newUserId.lastName,
                                "mobile": newUserId.mobile,
                                "countryCode": newUserId.countryCode,
                                "verificationCode": otpdata.toString(),
                                city: newUserId.city ? newUserId.city : '',
                                uniqueId: newUserId.uniqueId,
                                state: newUserId && newUserId.state ? newUserId.state : '',
                                country: newUserId && newUserId.country ? newUserId.country : '',
                            }


                            exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.USER_SIGNEDUP_SUCCESSFULLY, data: setObject });
                             let smsObj = new Sms();
                            await smsObj.sendOtp(newUserId.mobile,newUserId._id, newUserId.countryCode,otpdata);

                        } else {
                            let data = await (new RequestBody()).processRequestBody(this.req.body, ["deviceToken", "deviceType"]);
                            if (type == 'facebook') { data['fbId'] = socialId }
                            if (type == 'google') { data['googleId'] = socialId }
                            if (type == 'apple') { data['appleId'] = socialId }
                            data['lastSeen'] = new Date();
                            // data['deviceToken'] = this.req.body.deviceToken
                            // data['deviceType'] = this.req.body.device
                            await Users.update(data, { where: { id: user.id } });
                            let updatedUser = await Users.findOne({ where: { id: user.id } })

                            let token = await new Globals().getToken({ id: user.id });


                            let setObject = {
                                userId: updatedUser.id,
                                firstName: updatedUser.firstName,
                                lastName: updatedUser.lastName,
                                isVerified: updatedUser.isVerified,
                                isEmailVerified: updatedUser.isEmailVerified,
                                mobile: updatedUser.mobile,
                                countryCode: updatedUser.countryCode,
                                photo: updatedUser && updatedUser.photo ? updatedUser.photo : '',
                                city: updatedUser && updatedUser.city ? updatedUser.city : '',
                                emailId: updatedUser.emailId,
                                uniqueId: updatedUser.uniqueId,
                                state: updatedUser && updatedUser.state ? updatedUser.state : '',
                                stripeCustomerId: updatedUser.stripeCustomerId,
                                country: updatedUser && updatedUser.country ? updatedUser.country : '',

                            }

                            return exportLib.Response.handleResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.LOGIN_SUCCESS, data: setObject }, token);
                        }


                    }
                }


            } catch (error) {
                console.log('error =>', error)
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
          Purpose: send OTP new mobile number 
          Parameter:
          {
               "userId":"",
               "emailId":"",
               "countryCode":""
               "mobile":"",
          }
          Return: JSON String
          ********************************************************/
    async sendOTPMobile() {
            try {
                if (_.isEmpty(this.req.body.mobile)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.MOBILE });
                }
                if (_.isEmpty(this.req.body.countryCode)) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.COUNTRY_CODE });
                }
                if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
                }

                if (!_.isEmpty(this.req.body.mobile)) {
                    let findAnUserForUpdate = await Users.findOne({ where: { mobile: this.req.body.mobile, countryCode: this.req.body.countryCode, role: 'Customer' ,  accountDeactivated: false  } });
                    if (!_.isEmpty(findAnUserForUpdate)) {
                        return exportLib.Error.handleError(this.res, {
                            status: false,
                            code: 'CONFLICT',
                            message: exportLib.ResponseEn.ALREADY_MOBILE_USER,

                        });
                    }

                    let otpData = _.floor(100000 + _.random(0.1,  1.0) * 900000);
                    let codeExpiredIn = this.addMinutes(15);
                    await Users.update({ verificationCode: otpData, expireVerificationCode: codeExpiredIn, temporaryMobile: this.req.body.mobile, verificationType: 'ChangedMobile', temporaryCountryCode: this.req.body.countryCode }, { where: { id: this.req.body.userId } })


                    exportLib.Response.handleResponse(this.res, {
                        status: true,
                        code: 'SUCCESS',
                        message: exportLib.ResponseEn.OTP_SENT,
                        data: {
                            userId: this.req.body.userId,
                            mobile: this.req.body.mobile,
                            countryCode: this.req.body.countryCode,
                            verificationCode: otpData.toString()
                        }
                    });
                     let smsObj = new Sms();
                    await smsObj.sendOtp(this.req.body.mobile,this.req.body.userId,this.req.body.countryCode,otpData);

                }




            } catch (error) {
                console.log('error =>', error)
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
           Purpose: resend OTP new mobile number 
           Parameter:
           {
                "userId":"",
                "countryCode":""
                "mobile":"",
           }
           Return: JSON String
           ********************************************************/
    async resendOtpMobile() {
        try {
            if (!('mobile' in this.req.body)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.USER_ID });
            }
            if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            }

            let findAnUserForUpdate = await Users.findOne({ where: { mobile: this.req.body.mobile, countryCode: this.req.body.countryCode, role: 'Customer',  accountDeactivated: false  } });
            if (!_.isEmpty(findAnUserForUpdate)) {
                return exportLib.Error.handleError(this.res, {
                    status: false,
                    code: 'CONFLICT',
                    message: exportLib.ResponseEn.ALREADY_MOBILE_USER,

                });
            }

            // Find an user with given Mobile and Country code combination :
            let otpData = _.floor(100000 + _.random(0.1,  1.0) * 900000);
            var codeExpiredIn = this.addMinutes(15);

            await Users.update({ verificationCode: otpData, expireVerificationCode: codeExpiredIn }, { where: { id: this.req.body.userId } });
            exportLib.Response.handleResponse(this.res, {
                status: true,
                code: 'SUCCESS',
                message: exportLib.ResponseEn.OTP_SENT,
                data: {
                    userId: this.req.body.userId,
                    verificationCode: otpData.toString(),
                    mobile: this.req.body.mobile,
                    countryCode: this.req.body.countryCode
                }
            });
            let smsObj = new Sms();
            await smsObj.sendOtp(this.req.body.mobile, this.req.body.userId, this.req.body.countryCode, otpData);

        } catch (error) {
            console.log('error =>', error)
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
       Purpose: home listing
       Parameter:
       {
            "longitude":"",
            "latitude":""
       }
       Return: JSON String
       ********************************************************/
    async homeListing() {
            try {
                if (!this.req.body.longitude) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.longitude });
                }
                if (!this.req.body.latitude) {
                    return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.latitude });
                }
                // let point = { type: 'Point', coordinates: [-87.6770458, 41.9631174]};


                // check user id 
                let searchLat
                let searchLng
                if (this.req.body.latitude && this.req.body.longitude) {
                    searchLat = this.req.body.latitude
                    searchLng = this.req.body.longitude;
                } else {
                    let addressDetails = await Address.findOne({ where: { userId: this.req.body.userId }, primaryAddressStatus: true })
                    searchLat = addressDetails.latitude
                    searchLng = addressDetails.longitude;

                }

                let distanceQuery = `ST_Distance_Sphere(\`User->chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                // top rate dish listing logic
                let topRateDishList = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] },
                        { model: Category, attributes: ["id", "name"] },
                        { model: Preference, attributes: ["id", "name"] }
                    ],
                    where: { "dishStatus": "Publish" },
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    //order: [[sequelizeConnection.literal(distanceQuery), 'DESC']],
                    order: [
                        ['totalRating', 'DESC']
                    ],
                    limit: 5
                });

                topRateDishList.map((resultDish, key) => {
                    topRateDishList[key] = {
                        "id": resultDish.id,
                        "name": resultDish.name,
                        "media": resultDish.media,
                        "price": '$' + ' ' + (resultDish.price).toFixed(2),
                        //"price": '$' + ' ' + resultDish.price,
                        "type": resultDish.type,
                        description: resultDish.description,
                        preparationTime: resultDish.preparationTime,
                        isPreOrderOnly: resultDish.isPreOrderOnly,
                        cuisineName: resultDish.Cuisine && resultDish.Cuisine.name ? resultDish.Cuisine.name : '',
                        categoryName: resultDish.Category && resultDish.Category.name ? resultDish.Category.name : '',
                        preferenceName: resultDish.Preference && resultDish.Preference.name ? resultDish.Preference.name : '',
                        "totalRating": resultDish.totalRating,
                        "avgRate": resultDish.avgRate,
                    }
                })

                // top rate drinks listing logic
                let topRateDrinksList = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        }, { model: Cuisine, attributes: ["id", "name"] },
                        { model: Category, attributes: ["id", "name"] },
                        { model: Preference, attributes: ["id", "name"] }
                    ],
                    where: { "dishStatus": "Publish", categoryId: 7 },
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    // order: [[sequelizeConnection.literal(distanceQuery), 'DESC']],
                    order: [
                        ['totalRating', 'DESC']
                    ],
                    limit: 5
                });

                topRateDrinksList.map((resultDrinks, key) => {
                    topRateDrinksList[key] = {
                        "id": resultDrinks.id,
                        "name": resultDrinks.name,
                        "media": resultDrinks.media,
                        "price": '$' + ' ' + (resultDrinks.price).toFixed(2),
                        //"price": '$' + ' ' + resultDrinks.price,
                        "type": resultDrinks.type,
                        preparationTime: resultDrinks.preparationTime,
                        description: resultDrinks.description,
                        isPreOrderOnly: resultDrinks.isPreOrderOnly,
                        cuisineName: resultDrinks.Cuisine && resultDrinks.Cuisine.name ? resultDrinks.Cuisine.name : '',
                        categoryName: resultDrinks.Category && resultDrinks.Category.name ? resultDrinks.Category.name : '',
                        preferenceName: resultDrinks.Preference && resultDrinks.Preference.name ? resultDrinks.Preference.name : '',
                        "totalRating": resultDrinks.totalRating,
                        "avgRate": resultDrinks.avgRate,
                    }
                })

                // top rate deserts listing logic
                let topRateDesertsList = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        }, { model: Cuisine, attributes: ["id", "name"] },
                        { model: Category, attributes: ["id", "name"] },
                        { model: Preference, attributes: ["id", "name"] }
                    ],
                    where: { "dishStatus": "Publish", categoryId: 9 },
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    // order: [[sequelizeConnection.literal(distanceQuery), 'DESC']],
                    order: [
                        ['totalRating', 'DESC']
                    ],
                    limit: 5
                });

                topRateDesertsList.map((resultDeserts, key) => {
                    topRateDesertsList[key] = {
                        "id": resultDeserts.id,
                        "name": resultDeserts.name,
                        "media": resultDeserts.media,
                        "price": '$' + ' ' + (resultDeserts.price).toFixed(2),
                        //"price": '$' + ' ' + resultDeserts.price,
                        preparationTime: resultDeserts.preparationTime,
                        "type": resultDeserts.type,
                        description: resultDeserts.description,
                        isPreOrderOnly: resultDeserts.isPreOrderOnly,
                        cuisineName: resultDeserts.Cuisine && resultDeserts.Cuisine.name ? resultDeserts.Cuisine.name : '',
                        categoryName: resultDeserts.Category && resultDeserts.Category.name ? resultDeserts.Category.name : '',
                        preferenceName: resultDeserts.Preference && resultDeserts.Preference.name ? resultDeserts.Preference.name : '',
                        "totalRating": resultDeserts.totalRating,
                        "avgRate": resultDeserts.avgRate,
                    }
                })

                //chef newly added listing logic
                let distanceAddedChefQuery = `ST_Distance_Sphere(\`chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                let newlyAddedChefList = await Users.findAll({
                    attributes: ["id", "firstName", "lastName", "businessHourStart", "businessHourEnd", "photo", "avgRate", "isOnline", "topDishSelling"],
                    include: [{ model: Cuisine, attributes: ["id", "name"], through: { attributes: [] } },
                        {
                            model: Address,
                            as: 'chefAddress',
                            attributes: [
                                [sequelizeConnection.literal(distanceAddedChefQuery), 'distance']
                            ],
                            where: { addressType: 'Work' }
                        },
                    ],
                    having: {
                        'chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: { role: 'Chef' },
                    order: [
                        ['createdAt', 'DESC']
                    ],
                    limit: 7,
                    subQuery: false


                });

                Promise.all(newlyAddedChefList.map(async(resultAdded, key) => {
                    if (resultAdded.Cuisines.length != 0) {
                        let test = resultAdded.toJSON();
                        let cuisineValue = _.map(resultAdded.Cuisines, 'name');
                        newlyAddedChefList[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            isOnline: test.isOnline,
                            cuisineName: cuisineValue.toString(),
                            topDishSelling: test.topDishSelling,
                            "totalRating": test.totalRating,
                            photo: test.photo,
                            "avgRate": test.avgRate,
                            distance: Math.round(test.chefAddress.distance) + ' miles'
                        }
                    } else if (resultAdded.Cuisines.length == 0) {
                        let test = resultAdded.toJSON();
                        newlyAddedChefList[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            isOnline: test.isOnline,
                            cuisineName: '',
                            "totalRating": test.totalRating,
                            topDishSelling: test.topDishSelling,
                            photo: test.photo,
                            "avgRate": test.avgRate,
                            distance: Math.round(test.chefAddress.distance) + ' miles'

                        }
                    }

                }))


                //chef listing logic
                let topRateChefList = await Users.findAll({
                    attributes: ["id", "firstName", "lastName", "businessHourStart", "businessHourEnd", "photo", "avgRate", "isOnline", "topDishSelling"],
                    include: [{ model: Cuisine, attributes: ["id", "name"], through: { attributes: [] } },
                        {
                            model: Address,
                            as: 'chefAddress',
                            attributes: [
                                [sequelizeConnection.literal(distanceAddedChefQuery), 'distance']
                            ],
                            where: { addressType: 'Work' }
                        },
                    ],
                    having: {
                        'chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: { role: 'Chef' },
                    order: [
                        ['totalRating', 'DESC']
                    ],
                    limit: 7,
                    subQuery: false

                });

                Promise.all(topRateChefList.map(async(resultTopChef, key) => {
                    if (resultTopChef.Cuisines.length != 0) {
                        let test = resultTopChef.toJSON();
                        let cuisineValue = _.map(resultTopChef.Cuisines, 'name');
                        topRateChefList[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            isOnline: test.isOnline,
                            cuisineName: cuisineValue.toString(),
                            topDishSelling: test.topDishSelling,
                            "totalRating": test.totalRating,
                            photo: test.photo,
                            "avgRate": test.avgRate,
                            distance: Math.round(test.chefAddress.distance) + ' miles'
                        }
                    } else if (resultTopChef.Cuisines.length == 0) {
                        let test = resultTopChef.toJSON();
                        topRateChefList[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            isOnline: test.isOnline,
                            cuisineName: '',
                            "totalRating": test.totalRating,
                            photo: test.photo,
                            "avgRate": test.avgRate,
                            distance: Math.round(test.chefAddress.distance) + ' miles'

                        }
                    }

                }))


                // popular dish listing logic
                let popularChefList = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        }, { model: Cuisine, attributes: ["id", "name"] },
                        { model: Category, attributes: ["id", "name"] },
                        { model: Preference, attributes: ["id", "name"] }
                    ],
                    where: { "dishStatus": "Publish" },
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    // order: [[sequelizeConnection.literal(distanceQuery), 'DESC']],
                    order: [
                        ['topSelling', 'DESC']
                    ],
                    limit: 5
                });

                popularChefList.map((resultData, key) => {
                    popularChefList[key] = {
                        "id": resultData.id,
                        "name": resultData.name,
                        "media": resultData.media,
                        "price": '$' + ' ' + resultData.price,
                        description: resultData.description,
                        preparationTime: resultData.preparationTime,
                        chefName: resultData.User.firstName + ' ' + resultData.User.lastName,
                        "type": resultData.type,
                        cuisineName: resultData.Cuisine && resultData.Cuisine.name ? resultData.Cuisine.name : '',
                        categoryName: resultData.Category && resultData.Category.name ? resultData.Category.name : '',
                        preferenceName: resultData.Preference && resultData.Preference.name ? resultData.Preference.name : '',
                        "totalRating": resultData.totalRating,
                        isPreOrderOnly: resultData.isPreOrderOnly,
                        "avgRate": resultData.avgRate,
                    }
                })



                //recent order listing
                let recentOrder = []
                if (this.req.body.userId) {
                    let recentOrderListing = await Order.findOne({
                        attributes: ["id", "orderType", "orderUnique", "subTotal", "taxAmount", "discountAmount", "tipAmount", "deliveryAmount",
                            "totalAmount", "totalItem", "addressCustomer", "orderStatus", "orderDishType", 'chefId', 'isCustomTipStatus', 'isPercentageTipStatus', 'promoCodeApplyStatus', 'promoCode', 'customTipAmount', 'percentageTip'
                        ],
                        include: [{
                            model: OrderDetails,
                            attributes: ['price', 'quantity', 'attribute', 'totalPrice'],
                            include: [{
                                model: Dish,
                                attributes: ['id', 'name', 'type', 'media', 'price', 'description', 'preparationTime', 'type', 'isPreOrderOnly', 'avgRate', 'totalRating'],
                                include: [
                                    { model: Cuisine, attributes: ["id", "name"] },
                                    { model: Category, attributes: ["id", "name"] },
                                    { model: Preference, attributes: ["id", "name"] }
                                ]
                            }],

                        }, ],
                        where: { userId: this.req.body.userId, orderStatus: 'Delivered' }
                    })

                    if (recentOrderListing) {
                        let jsonValue = recentOrderListing.toJSON();

                        await Promise.all(jsonValue.OrderDetails.map((cartValue, key) => {
                            let recentOrderResponse = {
                                orderId: jsonValue.id,
                                "id": cartValue.Dish.id,
                                "name": cartValue.Dish.name,
                                "media": cartValue.Dish.media,
                                "price": '$' + ' ' + cartValue.Dish.price,
                                description: cartValue.Dish.description,
                                preparationTime: cartValue.Dish.preparationTime,
                                "type": cartValue.Dish.type,
                                cuisineName: cartValue.Dish.Cuisine && cartValue.Dish.Cuisine.name ? cartValue.Dish.Cuisine.name : '',
                                categoryName: cartValue.Dish.Category && cartValue.Dish.Category.name ? cartValue.Dish.Category.name : '',
                                preferenceName: cartValue.Dish.Preference && cartValue.Dish.Preference.name ? cartValue.Dish.Preference.name : '',
                                "totalRating": cartValue.Dish.totalRating,
                                isPreOrderOnly: cartValue.Dish.isPreOrderOnly,
                                "avgRate": cartValue.Dish.avgRate,
                            }
                            recentOrder.push(recentOrderResponse)

                        }))
                    }
                }

                //banner listing
                let bannerList = await BannerSchema.findAll({where:
                    {title:{[Op.ne]: null},description:{[Op.ne]: null}},
                    order: 
                        [['createdAt', 'DESC']]
                    ,
                    limit: 10})

                   
                
                if (topRateDishList.length == 0 && topRateDrinksList.length == 0 && topRateDesertsList.length == 0 && topRateChefList.length == 0) {
                    return exportLib.Response.handleResponse(this.res, {
                        status: true,
                        code: 'SUCCESS',
                        message: "",
                        data: {}
                    });
                }



                let responses = {
                    maxMiles: 14,
                    topRatedDish: topRateDishList,
                    topRatedDrinks: topRateDrinksList,
                    topRateDeserts: topRateDesertsList,
                    topRateChef: topRateChefList,
                    newlyAddedChef: newlyAddedChefList,
                    popularDish: popularChefList,
                    recentOrder: recentOrder.length != 0 ? recentOrder : [],
                    pastOrderRating: [],
                    bannerList:bannerList.length != 0 ? bannerList : []
                }
                return exportLib.Response.handleResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: responses
                });

            } catch (error) {
                console.log('error =>', error)
                return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
            }
        }
        /********************************************************
            Purpose: home listing
            Parameter:
            {
                 "longitude":"",
                 "latitude":""
            }
            Return: JSON String
            ********************************************************/
    async listing() {
        try {
            // if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
            //     return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            // }

            if (!this.req.body.longitude) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.longitude });
            }
            if (!this.req.body.latitude) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.latitude });
            }

            if (_.isEmpty(this.req.body.type)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.TYPE });
            }


            if (this.req.body.type == 'Chef') {
                let whereCondition = { role: 'Chef' }
                let havingCondition = {
                    'chefAddress.distance': {
                        [Op.lt]: 14
                    }
                }
                let orderBy = [
                        ['totalRating', 'DESC']
                    ]
                    //let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = this.req.body.latitude,
                    searchLng = this.req.body.longitude;
                let distanceAddedChefQuery = `ST_Distance_Sphere(\`chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;
                let limit = 10
                    //let cuisineWhereCnd = '';
                if (this.req.body.cuisineId != undefined) {
                    whereCondition['$Cuisines.id$'] = this.req.body.cuisineId
                        // cuisineWhereCnd = { id: this.req.body.cuisineId };
                }
                if (this.req.body.distanceFrom != undefined && this.req.body.distanceTo != undefined) {
                    let distanceFrom = this.req.body.distanceFrom == '1' ? 0 : this.req.body.distanceFrom
                    havingCondition = {
                        'chefAddress.distance': {
                            [Op.between]: [distanceFrom, this.req.body.distanceTo]
                        }
                    }
                }
                if (this.req.body.ratingFrom != undefined && this.req.body.ratingTo != undefined) {
                    whereCondition['avgRate'] = {
                        [Op.between]: [this.req.body.ratingFrom, this.req.body.ratingTo]
                    }
                }

                var criteria = {
                    where: Sequelize.where(Sequelize.fn("concat", Sequelize.col("firstName"), Sequelize.col("lastName")), {
                        like: `%${this.req.body.search}%`
                    })
                }

                if (this.req.body.search) {
                    whereCondition[Op.or] = [{
                                firstName: {
                                    [Op.like]: `%${this.req.body.search}%`
                                }
                            },
                            {
                                lastName: {
                                    [Op.like]: `%${this.req.body.search}%`
                                }
                            },
                            {
                                ['$Cuisines.name$']: {
                                    [Op.like]: `%${this.req.body.search}%`
                                }
                            },
                            {
                                [Op.or]: {
                                    namesQuery: Sequelize.where(
                                      Sequelize.fn(
                                        'concat',
                                        Sequelize.col('Users.firstName'),
                                        ' ',
                                        Sequelize.col('Users.lastName')
                                      ),
                                      {
                                        [Op.like]: `%${this.req.body.search}%`,
                                      }
                                    ),
                                  },
                            }
                        ]
                        // cuisineWhereCnd = { name: { [Op.like]: `%${this.req.body.search}%` } };
                }
                if (this.req.body.sort) {
                    if (this.req.body.sort == '1') {
                        orderBy = sequelizeConnection.literal(distanceQuery)
                    }
                    if (this.req.body.sort == '2') {
                        orderBy = [
                            ['firstName', 'ASC']
                        ]
                    }
                    if (this.req.body.sort == '3') {
                        orderBy = [
                            ['totalRating', 'DESC']
                        ]
                    }
                    if (this.req.body.sort == '4') {
                        orderBy = [
                            ['isOnline', 'DESC']
                        ]

                    }
                }
                var skips = (this.req.body.page - 1) * limit;
                let chefDetails = await Users.findAll({
                    attributes: ["id", "firstName", "lastName", "businessHourStart", "businessHourEnd", "photo", "totalRating", "avgRate", "isOnline", "createdAt", "topDishSelling"],
                    include: [{ model: Cuisine, attributes: ["id", "name"], through: { attributes: [] } },
                        {
                            model: Address,
                            as: 'chefAddress',
                            attributes: [
                                [sequelizeConnection.literal(distanceAddedChefQuery), 'distance']
                            ],
                            where: { addressType: 'Work' }
                        }
                    ],
                    having: havingCondition,
                    where: whereCondition,
                    order: orderBy,
                });

                if (_.isEmpty(chefDetails)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }
                let count = chefDetails;
                chefDetails = chefDetails.slice(skips, limit * this.req.body.page)

                let url = 'http://' + config.host + '/' + 'chefOrDishListing'
                    // let count  = await Users.findAll({
                    //     attributes: ["id","firstName","lastName","businessHourStart","businessHourEnd","photo","totalRating","avgRate","isOnline","createdAt",[sequelizeConnection.literal(distanceQuery), 'distance']],
                    //     include:[{model:Cuisine,attributes:["id","name"],where:cuisineWhereCnd,through: { attributes: [] }}],
                    //     having: { distance: { [Op.lt]: 25 } },
                    //     where:whereCondition,
                    //     order:orderBy
                    // });
                let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

                Promise.all(chefDetails.map(async(setResult, key) => {
                    if (setResult.Cuisines.length != 0) {
                        let test = setResult.toJSON();
                        let cuisineValue = _.map(setResult.Cuisines, 'name');
                        chefDetails[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            isOnline: test.isOnline,
                            cuisineName: cuisineValue.toString(),
                            "businessHourStart": test.businessHourStart,
                            "businessHourEnd": test.businessHourEnd,
                            topDishSelling: test.topDishSelling,
                            "avgRate": test.avgRate,
                            photo: test.photo,
                            distance: Math.round(test.chefAddress.distance) + ' miles'
                        }
                    } else if (setResult.Cuisines.length == 0) {
                        let test = setResult.toJSON();
                        chefDetails[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            isOnline: test.isOnline,
                            cuisineName: '',
                            "businessHourStart": test.businessHourStart,
                            "businessHourEnd": test.businessHourEnd,
                            topDishSelling: test.topDishSelling,
                            "avgRate": test.avgRate,
                            photo: test.photo,
                            distance: Math.round(test.chefAddress.distance) + ' miles'

                        }
                    }

                }))
                return exportLib.Response.handleListingResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: chefDetails,
                    current_page: this.req.body.page,
                    from: 21,
                    last_page: nextPage,
                    path: url,
                    per_page: limit,
                    to: 23,
                    total: count.length
                });






            } else if (this.req.body.type == 'Dish') {
                // let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = this.req.body.latitude
                let searchLng = this.req.body.longitude;
                let distanceQuery = `ST_Distance_Sphere(\`User->chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                let limit = 10
                var skipDish = (this.req.body.page - 1) * limit;

                let whereCondition = { dishStatus: 'Publish' }
                let orderBy = [
                    ['totalRating', 'DESC']
                ]

                if (this.req.body.cuisineId != undefined) {
                    whereCondition['cuisineId'] = this.req.body.cuisineId
                }
                if (this.req.body.preferenceId != undefined) {
                    whereCondition['preferenceId'] = this.req.body.preferenceId
                }
                if (this.req.body.priceFrom != undefined && this.req.body.priceTo != undefined) {
                    whereCondition['price'] = {
                        [Op.between]: [this.req.body.priceFrom, this.req.body.priceTo]
                    }
                }
                if (this.req.body.ratingFrom != undefined && this.req.body.ratingTo != undefined) {
                    whereCondition['avgRate'] = {
                        [Op.between]: [this.req.body.ratingFrom, this.req.body.ratingTo]
                    }
                }
                if (this.req.body.search) {
                    whereCondition[Op.or] = [{
                            name: {
                                [Op.like]: `%${this.req.body.search}%`
                            }
                        },
                        {
                            ['$Cuisine.name$']: {
                                [Op.like]: `%${this.req.body.search}%`
                            }
                        }
                    ]
                }
                if (this.req.body.sort) {
                    if (this.req.body.sort == '1') {
                        orderBy = sequelizeConnection.literal(distanceQuery)
                    }
                    if (this.req.body.sort == '2') {
                        orderBy = [
                            [Cuisine, 'name', 'ASC']
                        ]
                    }
                    if (this.req.body.sort == '3') {
                        orderBy = [
                            ['topSelling', 'DESC']
                        ]
                    }
                    if (this.req.body.sort == '4') {
                        orderBy = [
                            ['price', 'DESC']
                        ]

                    }
                    if (this.req.body.sort == '5') {
                        orderBy = [
                            ['price', 'ASC']
                        ]

                    }
                    if (this.req.body.sort == '6') {
                        orderBy = [
                            ['name', 'ASC']
                        ]

                    }
                }

                //console.log(whereCondition,'where body')
                let dishListing = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] }
                    ],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: whereCondition,
                    order: orderBy,
                    offset: skipDish,
                    limit: limit
                });
                if (_.isEmpty(dishListing)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }


                let url = 'http://' + config.host + '/' + 'chefOrDishListing'
                let count = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] }
                    ],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.gt]: 14
                        }
                    },
                    where: whereCondition,
                    order: orderBy,
                });

                let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

                dishListing.map((resultList, key) => {
                    dishListing[key] = {
                        "id": resultList.id,
                        "name": resultList.name,
                        "media": resultList.media,
                        "price": '$' + ' ' + (resultList.price).toFixed(2),
                        "type": resultList.type,
                        isPreOrderOnly: resultList.isPreOrderOnly,
                        chefName: resultList.User.firstName + ' ' + resultList.User.lastName,
                        cuisineName: resultList.Cuisine && resultList.Cuisine.name ? resultList.Cuisine.name : '',
                        "totalRating": resultList.totalRating,
                        "avgRate": resultList.avgRate,
                    }
                })

                return exportLib.Response.handleListingResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: dishListing,
                    current_page: this.req.body.page,
                    from: 21,
                    last_page: nextPage,
                    path: url,
                    per_page: limit,
                    to: 23,
                    total: count.length
                });


            } else if (this.req.body.type == 'Drinks') {
                // let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = this.req.body.latitude
                let searchLng = this.req.body.longitude;
                let distanceQuery = `ST_Distance_Sphere(\`User->chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;
                let limit = 10
                var skipDrinks = (this.req.body.page - 1) * limit;

                let whereCondition = { "dishStatus": "Publish", categoryId: 7 }
                let orderBy = [
                    ['totalRating', 'DESC']
                ]

                if (this.req.body.cuisineId != undefined) {
                    whereCondition['cuisineId'] = this.req.body.cuisineId
                }
                if (this.req.body.preferenceId != undefined) {
                    whereCondition['preferenceId'] = this.req.body.preferenceId
                }
                if (this.req.body.priceFrom != undefined && this.req.body.priceTo != undefined) {
                    whereCondition['price'] = {
                        [Op.between]: [this.req.body.priceFrom, this.req.body.priceTo]
                    }
                }
                if (this.req.body.ratingFrom != undefined && this.req.body.ratingTo != undefined) {
                    whereCondition['avgRate'] = {
                        [Op.between]: [this.req.body.ratingFrom, this.req.body.ratingTo]
                    }
                }
                if (this.req.body.search) {
                    whereCondition[Op.or] = [{
                        name: {
                            [Op.like]: `%${this.req.body.search}%`
                        }
                    }, ]
                }
                if (this.req.body.sort) {
                    if (this.req.body.sort == '1') {
                        orderBy = sequelizeConnection.literal(distanceQuery)
                    }
                    if (this.req.body.sort == '2') {
                        orderBy = [
                            [Cuisine, 'name', 'ASC']
                        ]
                    }
                    if (this.req.body.sort == '3') {
                        orderBy = [
                            ['topSelling', 'DESC']
                        ]
                    }
                    if (this.req.body.sort == '4') {
                        orderBy = [
                            ['price', 'DESC']
                        ]

                    }
                    if (this.req.body.sort == '5') {
                        orderBy = [
                            ['price', 'ASC']
                        ]

                    }
                    if (this.req.body.sort == '6') {
                        orderBy = [
                            ['name', 'ASC']
                        ]

                    }
                }

                let dishListing = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] }
                    ],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: whereCondition,
                    order: orderBy,
                    offset: skipDrinks,
                    limit: limit
                });
                if (_.isEmpty(dishListing)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }


                let url = 'http://' + config.host + '/' + 'chefOrDishListing'
                let count = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] }
                    ],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.gt]: 14
                        }
                    },
                    where: whereCondition,

                });
                let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

                dishListing.map((resultDrinkList, key) => {
                    dishListing[key] = {
                        "id": resultDrinkList.id,
                        "name": resultDrinkList.name,
                        "media": resultDrinkList.media,
                        "price": '$' + ' ' + (resultDrinkList.price).toFixed(2),
                        "type": resultDrinkList.type,
                        chefName: resultDrinkList.User.firstName + ' ' + resultDrinkList.User.lastName,
                        isPreOrderOnly: resultDrinkList.isPreOrderOnly,
                        cuisineName: resultDrinkList.Cuisine && resultDrinkList.Cuisine.name ? resultDrinkList.Cuisine.name : '',
                        "totalRating": resultDrinkList.totalRating,
                        "avgRate": resultDrinkList.avgRate,
                    }
                })

                return exportLib.Response.handleListingResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: dishListing,
                    current_page: this.req.body.page,
                    from: 21,
                    last_page: nextPage,
                    path: url,
                    per_page: limit,
                    to: 23,
                    total: count.length
                });


            } else if (this.req.body.type == 'Deserts') {
                // let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = this.req.body.latitude
                let searchLng = this.req.body.longitude;
                let distanceQuery = `ST_Distance_Sphere(\`User->chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                let limit = 10
                var skipDeserts = (this.req.body.page - 1) * limit;

                let whereCondition = { "dishStatus": "Publish", categoryId: 9 }
                let orderBy = [
                    ['totalRating', 'DESC']
                ]

                if (this.req.body.cuisineId != undefined) {
                    whereCondition['cuisineId'] = this.req.body.cuisineId
                }
                if (this.req.body.preferenceId != undefined) {
                    whereCondition['preferenceId'] = this.req.body.preferenceId
                }
                if (this.req.body.priceFrom != undefined && this.req.body.priceTo != undefined) {
                    whereCondition['price'] = {
                        [Op.between]: [this.req.body.priceFrom, this.req.body.priceTo]
                    }
                }
                if (this.req.body.ratingFrom != undefined && this.req.body.ratingTo != undefined) {
                    whereCondition['avgRate'] = {
                        [Op.between]: [this.req.body.ratingFrom, this.req.body.ratingTo]
                    }
                }
                if (this.req.body.search) {
                    whereCondition[Op.or] = [{
                        name: {
                            [Op.like]: `%${this.req.body.search}%`
                        }
                    }, ]
                }
                if (this.req.body.sort) {
                    if (this.req.body.sort == '1') {
                        orderBy = sequelizeConnection.literal(distanceQuery)
                    }
                    if (this.req.body.sort == '2') {
                        orderBy = [
                            [Cuisine, 'name', 'ASC']
                        ]
                    }
                    if (this.req.body.sort == '3') {
                        orderBy = [
                            ['topSelling', 'DESC']
                        ]
                    }
                    if (this.req.body.sort == '4') {
                        orderBy = [
                            ['price', 'DESC']
                        ]

                    }
                    if (this.req.body.sort == '5') {
                        orderBy = [
                            ['price', 'ASC']
                        ]

                    }
                    if (this.req.body.sort == '6') {
                        orderBy = [
                            ['name', 'ASC']
                        ]

                    }
                }


                let dishListing = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] }
                    ],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: whereCondition,
                    order: orderBy,
                    offset: skipDeserts,
                    limit: limit
                });
                if (_.isEmpty(dishListing)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }


                let url = 'http://' + config.host + '/' + 'chefOrDishListing'
                let count = await Dish.findAll({
                    'include': [{
                        model: Users,
                        attributes: ["id", "firstName", "lastName"],
                        'include': [{
                            model: Address,
                            as: 'chefAddress',
                            attributes: [
                                [sequelizeConnection.literal(distanceQuery), 'distance']
                            ],
                            where: { addressType: 'Work' }
                        }, ]
                    }, { model: Cuisine, attributes: ["id", "name"] }],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: whereCondition

                });
                let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

                dishListing.map((resultDesertsList, key) => {
                    dishListing[key] = {
                        "id": resultDesertsList.id,
                        "name": resultDesertsList.name,
                        "media": resultDesertsList.media,
                        "price": '$' + ' ' + (resultDesertsList.price).toFixed(2),
                        "type": resultDesertsList.type,
                        chefName: resultDesertsList.User.firstName + ' ' + resultDesertsList.User.lastName,
                        isPreOrderOnly: resultDesertsList.isPreOrderOnly,
                        cuisineName: resultDesertsList.Cuisine && resultDesertsList.Cuisine.name ? resultDesertsList.Cuisine.name : '',
                        "totalRating": resultDesertsList.totalRating,
                        "avgRate": resultDesertsList.avgRate,
                    }
                })

                return exportLib.Response.handleListingResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: dishListing,
                    current_page: this.req.body.page,
                    from: 21,
                    last_page: nextPage,
                    path: url,
                    per_page: limit,
                    to: 23,
                    total: count.length
                });


            } else if (this.req.body.type == 'NewChef') {
                let whereCondition = { role: 'Chef' }
                let havingCondition = {
                    'chefAddress.distance': {
                        [Op.lt]: 14
                    }
                }
                let orderBy = [
                        ['createdAt', 'DESC']
                    ]
                    // let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = this.req.body.latitude
                let searchLng = this.req.body.longitude;
                let distanceNewChefQuery = `ST_Distance_Sphere(\`chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;
                let limit = 10
                    //let cuisineWhereCnd = '';
                if (this.req.body.cuisineId != undefined) {
                    whereCondition['$Cuisines.id$'] = this.req.body.cuisineId
                        //cuisineWhereCnd = { id: this.req.body.cuisineId };
                }
                if (this.req.body.distanceFrom != undefined && this.req.body.distanceTo != undefined) {
                    havingCondition = {
                        'chefAddress.distance': {
                            [Op.between]: [this.req.body.distanceFrom, this.req.body.distanceTo]
                        }
                    }
                }
                if (this.req.body.ratingFrom != undefined && this.req.body.ratingTo != undefined) {
                    whereCondition['avgRate'] = {
                        [Op.between]: [this.req.body.ratingFrom, this.req.body.ratingTo]
                    }
                }
                if (this.req.body.search) {
                    whereCondition[Op.or] = [{
                            firstName: {
                                [Op.like]: `%${this.req.body.search}%`
                            }
                        },
                        {
                            lastName: {
                                [Op.like]: `%${this.req.body.search}%`
                            }
                        },
                        {
                            ['$Cuisines.name$']: {
                                [Op.like]: `%${this.req.body.search}%`
                            }
                        }
                    ]

                }
                if (this.req.body.sort) {
                    if (this.req.body.sort == '1') {
                        orderBy = sequelizeConnection.literal(distanceQuery)
                    }
                    if (this.req.body.sort == '2') {
                        orderBy = [
                            ['firstName', 'ASC']
                        ]
                    }
                    if (this.req.body.sort == '3') {
                        orderBy = [
                            ['totalRating', 'DESC']
                        ]
                    }
                    if (this.req.body.sort == '4') {
                        orderBy = [
                            ['isOnline', 'DESC']
                        ]

                    }
                }
                var skipNewChef = (this.req.body.page - 1) * limit;

                let chefDetails = await Users.findAll({
                    attributes: ["id", "firstName", "lastName", "businessHourStart", "businessHourEnd", "photo", "totalRating", "avgRate", "createdAt", "isOnline", "topDishSelling"],
                    include: [{ model: Cuisine, attributes: ["id", "name"], through: { attributes: [] } },
                        {
                            model: Address,
                            as: 'chefAddress',
                            attributes: [
                                [sequelizeConnection.literal(distanceNewChefQuery), 'distance']
                            ],
                            where: { addressType: 'Work' }
                        }
                    ],
                    having: havingCondition,
                    where: whereCondition,
                    order: orderBy,
                });

                if (_.isEmpty(chefDetails)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }
                let count = chefDetails;
                chefDetails = chefDetails.slice(skipNewChef, limit * this.req.body.page)

                let url = 'http://' + config.host + '/' + 'chefOrDishListing'
                    // let count  = await Users.findAll({
                    //     subQuery:false,
                    //     attributes: ["id","firstName","lastName","businessHourStart","businessHourEnd","photo","totalRating","avgRate","createdAt",[sequelizeConnection.literal(distanceQuery), 'distance']],
                    //     include:[{model:Cuisine,attributes:["id","name"],where:cuisineWhereCnd,through: { attributes: [] }}],
                    //     having: havingCondition,
                    //     where:whereCondition,
                    //     order:orderBy,

                // });
                //console.log(count.length,'count')
                let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

                Promise.all(chefDetails.map(async(resultNewChef, key) => {
                    if (resultNewChef.Cuisines.length != 0) {
                        let test = resultNewChef.toJSON();
                        let cuisineValue = _.map(resultNewChef.Cuisines, 'name');
                        chefDetails[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            cuisineName: cuisineValue.toString(),
                            "businessHourStart": test.businessHourStart,
                            "businessHourEnd": test.businessHourEnd,
                            topDishSelling: test.topDishSelling,
                            "isOnline": test.isOnline,
                            "avgRate": test.avgRate,
                            photo: test.photo,
                            distance: Math.round(test.chefAddress.distance) + ' miles'
                        }
                    } else if (resultNewChef.Cuisines.length == 0) {
                        let test = resultNewChef.toJSON();
                        chefDetails[key] = {
                            "id": test.id,
                            "firstName": test.firstName,
                            "lastName": test.lastName,
                            "media": test.media,
                            cuisineName: '',
                            "businessHourStart": test.businessHourStart,
                            "businessHourEnd": test.businessHourEnd,
                            "isOnline": test.isOnline,
                            topDishSelling: test.topDishSelling,
                            "avgRate": test.avgRate,
                            photo: test.photo,
                            distance: Math.round(test.chefAddress.distance) + ' miles'

                        }
                    }

                }))
                return exportLib.Response.handleListingResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: chefDetails,
                    current_page: this.req.body.page,
                    from: 21,
                    last_page: nextPage,
                    path: url,
                    per_page: limit,
                    to: 23,
                    total: count.length
                });






            } else if (this.req.body.type == 'Popular') {
                // let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
                let searchLat = this.req.body.latitude
                let searchLng = this.req.body.longitude;
                let distanceQuery = `ST_Distance_Sphere(\`User->chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;

                let limit = 10
                var skipDishes = (this.req.body.page - 1) * limit;

                let whereCondition = { dishStatus: 'Publish' }
                let orderBy = [
                    ['topSelling', 'DESC']
                ]

                if (this.req.body.cuisineId != undefined) {
                    whereCondition['cuisineId'] = this.req.body.cuisineId
                }
                if (this.req.body.preferenceId != undefined) {
                    whereCondition['preferenceId'] = this.req.body.preferenceId
                }
                if (this.req.body.priceFrom != undefined && this.req.body.priceTo != undefined) {
                    whereCondition['price'] = {
                        [Op.between]: [this.req.body.priceFrom, this.req.body.priceTo]
                    }
                }
                if (this.req.body.ratingFrom != undefined && this.req.body.ratingTo != undefined) {
                    whereCondition['avgRate'] = {
                        [Op.between]: [this.req.body.ratingFrom, this.req.body.ratingTo]
                    }
                }
                if (this.req.body.search) {
                    whereCondition[Op.or] = [{
                        name: {
                            [Op.like]: `%${this.req.body.search}%`
                        }
                    }, ]
                }
                if (this.req.body.sort) {
                    if (this.req.body.sort == '1') {
                        orderBy = sequelizeConnection.literal(distanceQuery)
                    }
                    if (this.req.body.sort == '2') {
                        orderBy = [
                            [Cuisine, 'name', 'ASC']
                        ]
                    }
                    if (this.req.body.sort == '3') {
                        orderBy = [
                            ['topSelling', 'DESC']
                        ]
                    }
                    if (this.req.body.sort == '4') {
                        orderBy = [
                            ['price', 'DESC']
                        ]

                    }
                    if (this.req.body.sort == '5') {
                        orderBy = [
                            ['price', 'ASC']
                        ]

                    }
                    if (this.req.body.sort == '6') {
                        orderBy = [
                            ['name', 'ASC']
                        ]

                    }
                }

                //console.log(whereCondition,'where body')
                let popularListing = await Dish.findAll({
                    'include': [{
                            model: Users,
                            attributes: ["id", "firstName", "lastName"],
                            'include': [{
                                model: Address,
                                as: 'chefAddress',
                                attributes: [
                                    [sequelizeConnection.literal(distanceQuery), 'distance']
                                ],
                                where: { addressType: 'Work' }
                            }, ]
                        },
                        { model: Cuisine, attributes: ["id", "name"] }
                    ],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: whereCondition,
                    order: orderBy,
                    offset: skipDishes,
                    limit: limit
                })
                if (_.isEmpty(popularListing)) {
                    return exportLib.Response.handleListingBlankResponse(this.res, { status: false, code: 'SUCCESS', message: '' });
                }


                let url = 'http://' + config.host + '/' + 'chefOrDishListing'
                let count = await Dish.findAll({
                    'include': [{
                        model: Users,
                        attributes: ["id", "firstName", "lastName"],
                        'include': [{
                            model: Address,
                            as: 'chefAddress',
                            attributes: [
                                [sequelizeConnection.literal(distanceQuery), 'distance']
                            ],
                            where: { addressType: 'Work' }
                        }, ]
                    }, { model: Cuisine, attributes: ["id", "name"] }],
                    having: {
                        'User.chefAddress.distance': {
                            [Op.lt]: 14
                        }
                    },
                    where: whereCondition

                });
                let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

                popularListing.map((resultPopularList, key) => {
                    popularListing[key] = {
                        "id": resultPopularList.id,
                        "name": resultPopularList.name,
                        "media": resultPopularList.media,
                        "price": '$' + ' ' + (resultPopularList.price).toFixed(2),
                        "type": resultPopularList.type,
                        chefName: resultPopularList.User.firstName + ' ' + resultPopularList.User.lastName,
                        isPreOrderOnly: resultPopularList.isPreOrderOnly,
                        cuisineName: resultPopularList.Cuisine && resultPopularList.Cuisine.name ? resultPopularList.Cuisine.name : '',
                        "totalRating": resultPopularList.totalRating,
                        "avgRate": resultPopularList.avgRate,
                    }
                })

                return exportLib.Response.handleListingResponse(this.res, {
                    status: true,
                    code: 'SUCCESS',
                    message: "",
                    data: popularListing,
                    current_page: this.req.body.page,
                    from: 21,
                    last_page: nextPage,
                    path: url,
                    per_page: limit,
                    to: 23,
                    total: count.length
                });







            }

        } catch (error) {
            console.log('error =>', error)
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }


    /********************************************************
        Purpose: list
        Return: JSON String
        ********************************************************/
    async getPreferenceList() {
        try {
            let andArray = { status: true };
            if (this.req.body.searchText) {
                andArray.name = {
                    [Op.like]: `%${this.req.body.searchText}%`
                };
            }


            let preferenceList = await Preference.findAll({
                attributes: ['id', 'name'],
                where: andArray,
                order: [
                    ['name']
                ]
            });
            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: "", data: preferenceList });
        } catch (error) {
            console.log(error);
            this.res.send({ status: 0, message: error });
        }
    }

    /********************************************************
    Purpose: Getting Dropdowns list
    Return: JSON String
    ********************************************************/
    async getCuisineList() {
        try {
            //let currentUser = this.req.currentUser;
            let ran = _.random(100000, 999999);
            let test = _.floor(100000 + _.random(0.1,  1.0) * 900000);
            console.log(ran, 'ran')
            console.log(test, 'math ran')
            let andArray = { status: true };
            if (this.req.body.searchText) {
                andArray.name = {
                    [Op.like]: `%${this.req.body.searchText}%`
                };
            }

            // let includeCnd = [];
            // if (this.req.body.showMyOnly !== undefined && this.req.body.showMyOnly) {
            //     includeCnd = [{
            //         model: UserSchema, attributes: [],
            //         through: { attributes: [] },
            //         where: { id: currentUser.id }
            //     }];
            // }

            let resultCuisine = await Cuisine.findAll({
                attributes: ['id', 'name', 'image'],
                // include: includeCnd,
                where: andArray,
                order: [
                    ['name']
                ]
            });
            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: exportLib.ResponseEn.SUCCESS, data: resultCuisine });
        } catch (error) {
            console.log("error", error)
            return exportLib.Error.handleError(this.res, { status: false, code: 'INTERNAL_SERVER_ERROR', message: error });
        }
    }

    /********************************************************
     Purpose: Get Chef Details
     Return: JSON String
     ********************************************************/
    async getChefDetails() {
        try {

            if (!this.req.body.longitude) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.longitude });
            }
            if (!this.req.body.latitude) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.latitude });
            }

            // if (this.req.body.userId === undefined || typeof this.req.body.userId != 'number') {
            //     return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.VALID_USERID });
            // }

            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID });
            }

            //   let addressDetails = await Address.findOne({where:{userId:this.req.body.userId},primaryAddressStatus:true})
            //   if (_.isEmpty(addressDetails)) 
            //   {
            //     return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NO_RECORD});
            //  }


            //let searchLat = addressDetails.latitude, searchLng = addressDetails.longitude;
            let searchLat
            let searchLng
            if (this.req.body.latitude && this.req.body.longitude) {
                searchLat = this.req.body.latitude
                searchLng = this.req.body.longitude;
            } else {
                let addressDetails = await Address.findOne({ where: { userId: this.req.body.userId }, primaryAddressStatus: true })
                searchLat = addressDetails.latitude
                searchLng = addressDetails.longitude;

            }
            //   let distanceQuery = `ST_Distance_Sphere(\`chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;
            //   let chefDetails  = await Users.findOne({
            //     subQuery: false,
            //     attributes: ["id","firstName","lastName","businessHourStart","businessHourEnd","photo","totalRating","avgRate","aboutMe"],
            //     include:[{model:Cuisine,attributes:["id","name"],through: { attributes: [] }},
            //     {model:Address,as: 'chefAddress',
            //     attributes:["id","latitude","longitude",[sequelizeConnection.literal(distanceQuery), 'distance']],where:{primaryAddressStatus:true}}],
            //     where:{id:this.req.body.id,role:'Chef'},
            //     order:sequelizeConnection.literal(distanceQuery)
            // });


            let distanceQuery = `ST_Distance_Sphere(\`chefAddress\`.\`addressPoint\`, point(${searchLng}, ${searchLat}) ) * .000621371192`;
            let chefDetails = await Users.findOne({
                subQuery: false,
                attributes: ["id", "firstName", "lastName", "businessHourStart", "businessHourEnd", "photo", "totalRating", "avgRate", "aboutMe", "topDishSelling", "totalComplements", 'isOnline'],
                include: [{ model: Cuisine, attributes: ["id", "name"], through: { attributes: [] } },
                    {
                        model: Address,
                        as: 'chefAddress',
                        attributes: [
                            "id", "latitude", "longitude", [sequelizeConnection.literal(distanceQuery), 'distance']
                        ],
                        where: { addressType: 'Work', primaryAddressStatus: true }
                    }
                ],
                // {model:Address,as: 'chefAddress',
                // attributes:["id","latitude","longitude",],where:{primaryAddressStatus:true}}],
                where: { id: this.req.body.id, role: 'Chef' },
                order: sequelizeConnection.literal(distanceQuery)
            });

            if (_.isEmpty(chefDetails)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.CHEF_NO_RECORD });
            }

            //find out category wise dish
            let categoryId = await Dish.findAll({ where: { userId: this.req.body.id, "dishStatus": "Publish" } })

            let object = []
            if (categoryId) {

                let cuisineValue = _.map(categoryId, 'categoryId');
                let category = await Category.findAll({ attributes: ["id", "name"], where: { id: cuisineValue } })
                await Promise.all(category.map(async(resultCategory, key) => {
                    let dishDetails = await Dish.findAll({
                        include: [
                            { model: Cuisine, attributes: ["id", "name"] }
                        ],
                        where: { "dishStatus": "Publish", categoryId: resultCategory.id, userId: this.req.body.id },
                        limit: 10
                    });
                    if (dishDetails.length != 0) {
                        await object.push({ categoryName: resultCategory.name, dish: dishDetails })
                    }
                }))


                // set response for category wise
                await Promise.all(object.map(async(dataObject, objectKey) => {
                    await Promise.all(dataObject.dish.map((dish, key) => {
                        object[objectKey]['dish'][key] = {
                            "id": dish.id,
                            "name": dish.name,
                            "media": dish.media,
                            "description": dish.description,
                            "type": dish.type,
                            "price": '$' + ' ' + dish.price,
                            "totalRating": dish.totalRating,
                            "avgRate": dish.avgRate,
                            topSelling: dish.topSelling,
                            isPreOrderOnly: dish.isPreOrderOnly,
                            cuisineName: dish.Cuisine && dish.Cuisine.name ? dish.Cuisine.name : ''
                        }
                    }))
                }))
            }
            let data = chefDetails.toJSON()
            console.log(data, 'data')
                //check chef favourite or not
            let chefFavourite
            if (this.req.body.userId) {
                chefFavourite = await Favourites.findOne({ where: { userId: this.req.body.userId, chefId: data.id } })
            }


            //set cuisine value # tag 
            let array
            if (data.Cuisines) {
                array = _.map(data.Cuisines, 'name')
                array.map((cuisine, key) => {
                    array[key] = '#' + cuisine
                })
            }

            //set response 
            let chefResponse = {
                "id": data.id,
                "firstName": data.firstName,
                "lastName": data.lastName,
                "businessHourStart": data.businessHourStart,
                "businessHourEnd": data.businessHourEnd,
                "photo": data.photo,
                "totalRating": data.totalRating,
                "avgRate": data.avgRate,
                "distance": Math.round(data.chefAddress.distance) + ' miles',
                topDishSelling: data.topDishSelling,
                totalComplements: data.totalComplements,
                aboutMe: data.aboutMe,
                isOnline: data.isOnline,
                "cuisinesName": array ? array.toString() : '',
                latitude: data.chefAddress && data.chefAddress.latitude ? data.chefAddress.latitude : 0.0,
                longitude: data.chefAddress && data.chefAddress.longitude ? data.chefAddress.longitude : 0.0,
                "isFavourite": chefFavourite ? true : false
            }




            //query for all list find out for chef
            let dishList = await Dish.findAll({
                where: { userId: this.req.body.id, "dishStatus": "Publish" },
                attributes: ["id", "name", "media", "description", "totalRating", "price", "avgRate", "type", "topSelling", "isPreOrderOnly"],
                include: [{ model: Cuisine, attributes: ["id", "name"] }],
                order: [
                    ['createdAt', 'DESC']
                ]
            });
            await Promise.all(dishList.map((dish, key) => {
                dishList[key] = {
                    "id": dish.id,
                    "name": dish.name,
                    "media": dish.media,
                    "description": dish.description,
                    "type": dish.type,
                    "price": '$' + ' ' + dish.price,
                    "totalRating": dish.totalRating,
                    "avgRate": dish.avgRate,
                    topSelling: dish.topSelling,
                    isPreOrderOnly: dish.isPreOrderOnly,
                    cuisineName: dish.Cuisine && dish.Cuisine.name ? dish.Cuisine.name : ''
                }
            }))

            if (dishList.length > 0) {
                object.push({ categoryName: 'All', dish: dishList })
            }

            //query for bestseller find out for chef
            let dishSellingList = await Dish.findAll({
                where: {
                    userId: this.req.body.id,
                    topSelling: {
                        [Op.ne]: 0,
                        "dishStatus": "Publish"
                    }
                },
                attributes: ["id", "name", "media", "description", "totalRating", "price", "avgRate", "type", "topSelling"],
                include: [{ model: Cuisine, attributes: ["id", "name"] }],
                order: [
                    ['topSelling', 'DESC']
                ]
            });


            await Promise.all(dishSellingList.map((dish, key) => {
                dishSellingList[key] = {
                    "id": dish.id,
                    "name": dish.name,
                    "media": dish.media,
                    "description": dish.description,
                    "type": dish.type,
                    "price": '$' + ' ' + dish.price,
                    "totalRating": dish.totalRating,
                    "avgRate": dish.avgRate,
                    topSelling: dish.topSelling,
                    isPreOrderOnly: dish.isPreOrderOnly,
                    cuisineName: dish.Cuisine && dish.Cuisine.name ? dish.Cuisine.name : ''
                }
            }))
            if (dishSellingList.length > 0) {
                object.push({ categoryName: 'BestSeller', dish: dishSellingList })
            }



            //query for bestseller find out for chef
            let dishPreOrderList = await Dish.findAll({
                where: { userId: this.req.body.id, isPreOrderOnly: true, "dishStatus": "Publish" },
                attributes: ["id", "name", "media", "description", "totalRating", "price", "avgRate", "type", "isPreOrderOnly", "topSelling"],
                include: [{ model: Cuisine, attributes: ["id", "name"] }],
                order: [
                    ['topSelling', 'DESC']
                ]
            });


            await Promise.all(dishPreOrderList.map((dish, key) => {
                dishPreOrderList[key] = {
                    "id": dish.id,
                    "name": dish.name,
                    "media": dish.media,
                    "description": dish.description,
                    "type": dish.type,
                    "price": '$' + ' ' + dish.price,
                    "totalRating": dish.totalRating,
                    "avgRate": dish.avgRate,
                    topSelling: dish.topSelling,
                    isPreOrderOnly: dish.isPreOrderOnly,
                    cuisineName: dish.Cuisine && dish.Cuisine.name ? dish.Cuisine.name : ''
                }
            }))
            if (dishPreOrderList.length > 0) {
                object.push({ categoryName: 'PreOrder', dish: dishPreOrderList })
            }



            let responseChef = {
                chefProfile: chefResponse,
                dishList: _.sortBy(object, 'categoryName')
            }


            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: "", data: responseChef });
        } catch (error) {
            console.log(error);
            this.res.send({ status: 0, message: error });
        }
    }

    /********************************************************
     Purpose: Get Chef Details
     Return: JSON String
     ********************************************************/
    async getDishDetails() {
        try {

            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID });
            }


            let dishDetails = await Dish.findOne({
                include: [{
                    model: Users,
                    attributes: ["id", "firstName", "lastName", "photo", "totalRating", "avgRate", "isOnline", "topDishSelling"]
                }, { model: Cuisine, attributes: ["id", "name"] }, { model: Category, attributes: ["id", "name"] }, { model: Preference, attributes: ["id", "name"] }],
                where: { id: this.req.body.id },
            });
            if (_.isEmpty(dishDetails)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NO_RECORD });
            }

            // check favourite chef and dish
            let dishFavourite
            let chefFavourite
            if (this.req.body.userId) {
                dishFavourite = await Favourites.findOne({ where: { userId: this.req.body.userId, dishId: dishDetails.id } })
                chefFavourite = await Favourites.findOne({ where: { userId: this.req.body.userId, chefId: dishDetails.User.id } })
            }

            //check att
            if (dishDetails && dishDetails.attribute) {
                await Promise.all(dishDetails.attribute.map(async(resultAttribute, key) => {
                    let name = await Attribute.findOne({ where: { id: resultAttribute.id }, paranoid: false })
                    dishDetails.attribute[key] = {
                        "id": resultAttribute.id,
                        "name": name.name,
                        "price": '$' + resultAttribute.price
                    }

                }))
            }

            //getting user profile pic of dish rating & review    
            let reviewPhoto = []
            let reviewList = await RatingDish.findAll({
                'include': [{
                    model: Users,
                    attributes: ["photo"],
                }],
                where: { dishId: this.req.body.id },
                order: [
                    ['createdAt', 'DESC']
                ],
                limit: 5
            });
            if (reviewList) {
                reviewList.map(reviewPic => {
                    reviewPhoto.push(reviewPic.User.photo);
                })
            }


            let responseDish = {
                "id": dishDetails.id,
                "name": dishDetails.name,
                "media": dishDetails.media,
                "description": dishDetails.description,
                "price": '$' + dishDetails.price,
                "type": dishDetails.type,
                "preparationTime": dishDetails.preparationTime,
                nutrition: dishDetails && dishDetails.nutrition ? dishDetails.nutrition : [],
                "totalRating": dishDetails.totalRating,
                "avgRate": dishDetails.avgRate,
                "topSelling": dishDetails.topSelling,
                "isFavourite": dishFavourite ? true : false,
                isPreOrderOnly: dishDetails.isPreOrderOnly,
                preferenceName: dishDetails.Preference && dishDetails.Preference.name ? dishDetails.Preference.name : '',
                categoryName: dishDetails.Category && dishDetails.Category.name ? dishDetails.Category.name : '',
                cuisineName: dishDetails.Cuisine && dishDetails.Cuisine.name ? dishDetails.Cuisine.name : '',
                "chef": {
                    "id": dishDetails.User.id,
                    "firstName": dishDetails.User.firstName,
                    "lastName": dishDetails.User.lastName,
                    "photo": dishDetails.User.photo,
                    "totalRating": dishDetails.User.totalRating,
                    topDishSelling: dishDetails.User.topDishSelling,
                    "isOnline": dishDetails.User.isOnline,
                    "avgRate": dishDetails.User.avgRate,
                    "isFavourite": chefFavourite ? true : false
                },
                attribute: dishDetails && dishDetails.attribute ? dishDetails.attribute : [],
                reviews: reviewPhoto.length != 0 ? reviewPhoto : []


            }




            return exportLib.Response.handleResponse(this.res, { status: true, code: 'SUCCESS', message: "", data: responseDish });
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
     Purpose: Get Dish rating and review
     Return: JSON String
     ********************************************************/
    async getDishRatingReview() {
        try {

            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID });
            }
            let limit = 10
            var skips = (this.req.body.page - 1) * limit;
            let orderBy = [
                ['createdAt', 'DESC']
            ]
            if (this.req.body.sort) {
                if (this.req.body.sort == '1') {
                    orderBy = [
                        ['rating', 'DESC']
                    ]
                }
                if (this.req.body.sort == '2') {
                    orderBy = [
                        ['rating', 'ASC']
                    ]
                }

            }

            let ratingListing = await RatingDish.findAll({
                attributes: ["id", "rating", "comment", "userId", "dishId"],
                include: [{
                    model: Users,
                    attributes: ["id", "firstName", "lastName", "photo"]
                }],
                where: { dishId: this.req.body.id },
                order: orderBy,
                offset: skips,
                limit: 10
            });
            if (_.isEmpty(ratingListing)) {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NO_RECORD });
            }
            let count = await RatingDish.findAll({
                attributes: ["id", "rating", "comment", "userId", "dishId"],
                include: [{
                    model: Users,
                    attributes: ["id", "firstName", "lastName", "photo"]
                }],
                where: { dishId: this.req.body.id },
                order: orderBy,
                offset: skips,
                limit: 10
            });
            let url = 'http://' + config.host + '/' + 'getDishRatingReview'
            let nextPage = await this.getNextPage(this.req.body.page, limit, count.length)

            return exportLib.Response.handleListingResponse(this.res, {
                status: true,
                code: 'SUCCESS',
                message: "",
                data: ratingListing,
                current_page: this.req.body.page,
                from: 21,
                last_page: nextPage,
                path: url,
                per_page: limit,
                to: 23,
                total: count.length
            });
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
     Purpose: Get Chef complements rating & reviews
     Return: JSON String
     ********************************************************/
    async getChefComplements() {
        try {

            if (this.req.body.id === undefined || typeof this.req.body.id != 'number') {
                return exportLib.Error.handleError(this.res, { status: false, code: 'UNPROCESSABLE_ENTITY', message: exportLib.ResponseEn.ID });
            }
            let resultData = await Users.findOne({ attributes: ["id", "firstName", "lastName", "avgRate", "totalRating", "totalRatingStar", "totalComplementsType"], where: { id: this.req.body.id } })

            if (_.isEmpty(resultData.totalComplementsType)) {
                resultData.totalComplementsType = {};
            }
            let complementsTypes = await complementsTypeSchema.findAll({ attributes: ['id', 'name', 'image'] })
            let complements = [];
            _.map(complementsTypes, item => {
                complements.push({
                    name: item.name,
                    image: item.image,
                    total: resultData.totalComplementsType[item.id] ? resultData.totalComplementsType[item.id] : 0
                })
            })
            resultData.totalComplementsType = complements;


            //   if (_.isEmpty(ratingListing)) {
            //     return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.NO_RECORD});
            // }


            return exportLib.Response.handleResponse(this.res, {
                status: true,
                code: 'SUCCESS',

                data: resultData,

            });
        } catch (error) {
            console.log(error);
            return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR' });
        }
    }

    /********************************************************
     Purpose: deActivateAccount User
     Parameter:
     {}
     Return: JSON String
     ********************************************************/
     async deActivateAccount() {
        try {
            const currentUser = this.req.currentUser ? this.req.currentUser : {};
            if (currentUser && currentUser.dataValues.id) {
                let params = { token: null };
                let filter = { userId: currentUser.dataValues.id };
                await Authentication.update(params, { where: filter });
                await Users.update({ accountDeactivated : true , emailId : null }, { where: { id: currentUser.dataValues.id } });
                return exportLib.Response.handleMessageResponse(this.res, { status: true, code: 'OK', message: exportLib.ResponseEn.ACCOUNT_DEACTIVATE_SUCCESS })
            } else {
                return exportLib.Error.handleError(this.res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
            }

        } catch (error) {
            console.log('error', error);
            this.res.send({ status: 0, message: error });
        }

    }



}
module.exports = UsersController;