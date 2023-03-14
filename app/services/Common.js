/****************************
 Common services
 ****************************/
const _ = require("lodash");
const bcrypt = require('bcrypt');
const https = require('https');
const Moment = require('moment');
const i18n = require("i18n");
const json2csv = require('json2csv').parse;
const json2xls = require('json2xls');
const path = require('path');
const fs = require('fs');
let pdf = require('html-pdf');
let xlsxj = require("xlsx-to-json");
const csvjson = require('csvjson');
const Mustache = require('mustache');


const PushNotification = require('./PushNotification');
const Config = require('../../configs/configs');
const Users = require('../modules/User/Schema').Users;
const RequestBody = require("./RequestBody");
const File = require('./File');
const Model = require("../modules/Base/Model");
//const { ColumnSettings, FilterSettings, TemplateSettings } = require('../modules/UserManagement/Schema');
const Form = require("../services/Form");
const { DataSync } = require("aws-sdk");
const NotificationTemplateSchema = require('../modules/Notification/Schema').NotificationTemplate;
const NotificationAdminSchema = require('../modules/Notification/Schema').NotificationAdmin;
const NotificationSchema = require('../modules/Notification/Schema').Notification;


class Common {

    /********************************************************
     Purpose:Service for error handling
     Parameter:
     {
         errObj: {},
         schema: {}
     }
     Return: JSON String
     ********************************************************/
    errorHandle(errObj, schema = null) {
        return new Promise(async (resolve, reject) => {
            try {
                let errorMessage = "Internal server error.";
                if (errObj && errObj.code) {
                    switch (errObj.code) {
                        case 11000:
                            errorMessage = "Duplicate key error";
                            if (schema) {
                                const indexes = [[{ _id: 1 }, { unique: true }]].concat(schema.indexes());
                                await indexes.forEach(async (index) => {
                                    const paths = Object.keys(index[0]);
                                    if ((errObj.message).includes(paths[0])) {
                                        errorMessage = ` ${paths[0]} expects to be unique. `;
                                    }
                                });
                            }
                            break;
                        case 0:
                            errorMessage = "";
                            break;
                        case 1:
                            errorMessage = "";
                            break;
                        default:
                            break;
                    }
                } else if (errObj && errObj.message && errObj.message.errmsg) {
                    errorMessage = errObj.message.errmsg;
                } else if (errObj && errObj.errors) {
                    if (schema) {
                        // schema.eachPath(function (path) {
                        //     console.log('path', path);
                        //     if (_.has(errObj.errors, path) && errObj.errors[path].message) {
                        //         errorMessage = errObj.errors[path].message;
                        //     }
                        // });
                        schema.eachPath(function (path1) {
                            console.log('path1', path1);
                            if (_.has(errObj.errors, path1) && errObj.errors[path1].message) {
                                errorMessage = errObj.errors[path1].message;
                            }
                        });

                    }
                } else if (errObj && errObj.message && errObj.message.errors) {
                    if (schema) {
                        // schema.eachPath(function (path) {
                        //     console.log('path', path);
                        //     if (_.has(errObj.message.errors, path) && errObj.message.errors[path].message) {
                        //         errorMessage = errObj.message.errors[path].message;
                        //         console.log('errorMessage', errorMessage);
                        //     }
                        // });
                        schema.eachPath(function (path2) {
                            console.log('path2', path2);
                            if (_.has(errObj.message.errors, path2) && errObj.message.errors[path2].message) {
                                errorMessage = errObj.message.errors[path2].message;
                                console.log('errorMessage', errorMessage);
                            }
                        });

                    }
                }
                return resolve(errorMessage);
            } catch (error) {
                return reject({ status: 0, message: error });
            }
        });
    }

   /********************************************************
     Purpose: Service for sending push notification
     Parameter:
     {
        data:{
            deviceToken:"",
            device:"",
            title:"",
            message:""
        }
     }
     Return: JSON String
     ********************************************************/
    sendPushNotification(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let template = await NotificationTemplateSchema.findOne({ raw: true, where: { templateKey: data.templateKey, status: true } });
                if (template) {
                    let addData = {
                        type: template.templateType,
                        subType: template.templateKey,
                        title:data.payload.title,
                        message:data.payload.message,
                        dataId: data.dataId,
                        userType: data.payload.userType,
                        userId: data.userId,
                        image: template.image
                    }
                    if (_.isArray(data.userId)) {
                        data.userId.map(a => {
                            addData.userId = a;
                            NotificationSchema.create(addData);
                        });
                    } else {
                        NotificationSchema.create(addData);
                    }

                    if (data.payload) 
                    {
                      
                            let notificationData = data.payload;
                            await PushNotification.sendAndroid(notificationData);
                        
    
                    }

                    return resolve({ status: 1 })
                } else {
                    return resolve({ status: 0, message: "Template not found" })
                }
            } catch (error) {
                console.log('error in send', error);
                resolve();
            }
        });

    }

    /********************************************************
    Purpose: Encrypt password
    Parameter:
        {
            "data":{
                "password" : "test123"
            }
        }
    Return: JSON String
    ********************************************************/
    ecryptPassword(data) {
        return new Promise(async (resolve, reject) => {
            try {
                if (data && data.password) {
                    let password = bcrypt.hashSync(data.password, 10);
                    return resolve(password);
                }
                return resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /********************************************************
    Purpose: Compare password
    Parameter:
        {
            "data":{
                "password" : "Buffer data", // Encrypted password
                "savedPassword": "Buffer data" // Encrypted password
            }
        }
    Return: JSON String
    ********************************************************/
    verifyPassword(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let isVerified = false;
                if (data && data.password && data.savedPassword) {
                    let base64data = Buffer.from(data.savedPassword, 'binary').toString();
                    isVerified = await bcrypt.compareSync(data.password, base64data)
                }
                return resolve(isVerified);
            } catch (error) {
                reject(error);
            }
        });
    }

    /********************************************************
    Purpose: Validate password
    Parameter:
        {
            "data":{
                "password" : "test123",
                "userObj": {}
            }
        }
    Return: JSON String
    ********************************************************/
    validatePassword(data) {
        return new Promise(async (resolve, reject) => {
            try {
                if (data && data.password) {
                    if (data.userObj && _.isEqual(data.password, data.userObj.firstname)) {
                        return resolve({ status: 0, message: i18n.__("PASSWORD_NOT_SAME_FIRSTNAME") });
                    }
                    // Check new password is already used or not
                    if (Config.dontAllowPreviouslyUsedPassword && Config.dontAllowPreviouslyUsedPassword == 'true' && data.userObj && data.userObj.previouslyUsedPasswords && Array.isArray(data.userObj.previouslyUsedPasswords) && data.userObj.previouslyUsedPasswords.length) {
                        let isPreviouslyUsed = _.filter(data.userObj.previouslyUsedPasswords, (previouslyUsedPassword) => {
                            let base64data = Buffer.from(previouslyUsedPassword, 'binary').toString();
                            return bcrypt.compareSync(data.password, base64data)
                        });
                        if (isPreviouslyUsed && Array.isArray(isPreviouslyUsed) && isPreviouslyUsed.length) {
                            return resolve({ status: 0, message: i18n.__("ALREADY_USED_PASSWORD") });
                        }
                    }
                    return resolve({ status: 1, message: "Valid password." });
                } else {
                    return resolve({ status: 0, message: "Password required." });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /********************************************************
     Purpose: Service for handling wrong password attempt
     Parameter:
     {
        data:{
            user:{},
            ip:"10.2.2.43",
            password:"test"
        }
     }
     Return: JSON String
     ********************************************************/
    handleWrongPasswordAttempt(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let user = data.user ? data.user : {};
                let ip = data.ip ? data.ip : null;
                let password = data.password ? data.password : null;
                const isPasswordCorrect = await this.verifyPassword({ password: password, savedPassword: user.password });

                if (user.failedAttempts && Array.isArray(user.failedAttempts) && user.failedAttempts) {
                    let filteredObj = _.filter(user.failedAttempts, (obj) => {
                        return _.isEqual(obj.ip, ip)
                    });

                    if (filteredObj && Array.isArray(filteredObj) && filteredObj.length && _.head(filteredObj)) {
                        filteredObj = _.head(filteredObj);
                        if (filteredObj.isBlocked) {
                            let blockedDate = Moment(filteredObj.blockedDate, 'YYYY-MM-DD HH:mm:ss');
                            let currentDate = Moment(new Date(), 'YYYY-MM-DD HH:mm:ss');
                            let duration = Moment.duration(currentDate.diff(blockedDate));
                            let minutes = duration.asMinutes();

                            if (minutes >= parseInt(Config.timeDurationOfBlockingAfterWrongAttempts)) {
                                let params = { "failedAttempts.$.isBlocked": false, "failedAttempts.$.attempts": isPasswordCorrect ? 0 : 1 };
                                // await Users.findOneAndUpdate({ _id: user._id, "failedAttempts.ip": ip }, params, { new: true });
                                await Users.update(params, { where: { id: user.dataValues.id, "failedAttempts.ip": ip } });
                                return !isPasswordCorrect ? resolve({ status: 0, message: i18n.__("INVALID_PASSWORD") }) : resolve();
                            } else {
                                return resolve({ status: 0, message: i18n.__("LOGIN_BLOCKED_TEMP") });
                            }

                        } else if (!isPasswordCorrect) {
                            let params = { $inc: { "failedAttempts.$.attempts": 1 } };
                            if (filteredObj.attempts >= parseInt(Config.allowedFailAttemptsOfLogin)) {
                                params = { "failedAttempts.$.isBlocked": true, "failedAttempts.$.blockedDate": new Date() };
                            }
                            //await Users.findOneAndUpdate({ _id: user._id, "failedAttempts.ip": ip }, params, { new: true });
                            await Users.update(params, { where: { id: user.dataValues.id, "failedAttempts.ip": ip } });
                            return resolve({ status: 0, message: i18n.__("INVALID_PASSWORD") });
                        }
                    } else if (!isPasswordCorrect) {
                        // await Users.findOneAndUpdate({ _id: user._id }, { $push: { "failedAttempts": { "ip": ip, "attempts": 1 } } }, { new: true });
                        await Users.update({ $push: { "failedAttempts": { "ip": ip, "attempts": 1 } } }, { where: { id: user.dataValues.id, "failedAttempts.ip": ip } });

                        return resolve({ status: 0, message: i18n.__("INVALID_PASSWORD") });
                    }
                } else if (!isPasswordCorrect) {
                    // await Users.findOneAndUpdate({ _id: user._id }, { $set: { "failedAttempts": [{ "ip": ip, "attempts": 1 }] } }, { new: true });
                    await Users.update({ $set: { "failedAttempts": [{ "ip": ip, "attempts": 1 }] } }, { where: { id: user.dataValues.id, "failedAttempts.ip": ip } });

                    return resolve({ status: 0, message: i18n.__("INVALID_PASSWORD") });
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /********************************************************
     Purpose: Service for listing records
     Parameter:
     {
        data:{
            bodyData:{},
            model:{}
        }
     }
     Return: JSON String
     ********************************************************/
    listing(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let bodyData = data.bodyData;
                let model = data.bodyData.model;

                let adminId = data.bodyData.adminId
                let selectObj = data.selectObj ? data.selectObj : {};

                let includeCnd = (data.includeCnd) ? data.includeCnd : [];
                let query = data.query ? data.query : {};
                if (model.rawAttributes.isDeleted !== undefined) {
                    query.isDeleted = false;
                }
                let searchText = data.searchText ? data.searchText : '';
                let fieldsArray = data.fieldsArray ? data.fieldsArray : [];
                if (bodyData.page && bodyData.pagesize) {
                    let skip = (bodyData.page - 1) * (bodyData.pagesize);
                    let sort = bodyData.sort ? [Object.keys(bodyData.sort)[0], Object.values(bodyData.sort)[0] == 1 ? 'ASC' : 'DESC'] : ['createdAt', 'DESC'];
                    /**** searchText condition *****/
                    let search = (searchText != '') ? await this.searchData({ searchText, fieldsArray }) : {};
                    /******** filtered data ********/
                    let filter = !_.isEmpty(bodyData.filter) ? await this.constructFilter({ filter: bodyData.filter, condition: (bodyData.condition) ? bodyData.condition : 'and' }) : {};
                    // console.log("filter", JSON.stringify(filter))

                    let listing; let finalQuery;
                    finalQuery = { where: { [Op.and]: [query, search, filter] } };
                    listing = await model.findAll({ ...finalQuery, include: includeCnd, offset: skip, limit: bodyData.pagesize, order: [sort], attributes: { exclude: selectObj.excludeAttr } });
                    const total = await model.count(finalQuery);

                    let columnKey = data.bodyData.columnKey;
                    if (columnKey) {
                        /***** column settings *****/
                        let columnSettingsData = await ColumnSettings.findOne({ where: { adminId: adminId, key: columnKey }, attributes: ['key', 'columns', 'latestColumns'] });
                        let columnSettings = columnSettingsData && columnSettingsData.columns ? columnSettingsData.columns : [];
                        let latestColumns = columnSettingsData && columnSettingsData.latestColumns ? columnSettingsData.latestColumns : [];

                        /****** filter settings *****/
                        let filterSettings = await FilterSettings.findAll({ where: { adminId: adminId, key: columnKey } });
                        filterSettings = !_.isEmpty(filterSettings) ? filterSettings : [];
                        return resolve({ status: 1, data: { listing, columnSettings, latestColumns, filterSettings }, page: parseInt(bodyData.page), perPage: parseInt(bodyData.pagesize), total: total });
                    } else {
                        return resolve({ status: 1, data: { listing }, page: parseInt(bodyData.page), perPage: parseInt(bodyData.pagesize), total: total });
                    }
                } else {
                    return resolve({ status: 0, message: "Page and pagesize required." })
                }
            } catch (error) {
                return reject(error)
            }
        });
    }

    /********************************************************
     Purpose: Service for searching records
     Parameter:
     {
        data:{
            bodyData:{},
            model:{}
        }
     }
     Return: JSON String
     ********************************************************/
    searchData(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let searchText = data.searchText;
                let fieldsArray = data.fieldsArray;
                let orArray = [];
                // await fieldsArray.map(data => {
                //     orArray.push({ [data]: { [Op.like]: `%${searchText}%` } });
                // });
                await fieldsArray.map(dataMap => {
                    orArray.push({ [dataMap]: { [Op.like]: `%${searchText}%` } });
                });
                return resolve({ [Op.or]: orArray })
            } catch (error) {
                return reject(error);
            }
        })
    }

    constructFilter(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let commonFilter = {};
                let cndArray = [];
                let filter1 = commonFilter;
                if (data.filter && Array.isArray(data.filter)) {
                    let filter = data.filter;
                    for (let index in filter) {
                        let details = filter[index];
                        let keyValue = details.value;
                        let filterQuery;
                        if (details.type == 'contains') {
                            filterQuery = { [details.key]: { [Op.like]: `%${keyValue}%` } };
                        }
                        else if (details.type == 'greaterThan') {
                            filterQuery = { [details.key]: { [Op.gte]: parseInt(keyValue) } };
                        }
                        else if (details.type == 'lessThan') {
                            filterQuery = { [details.key]: { [Op.lte]: parseInt(keyValue) } };
                        }
                        else {
                            /**** getting details  ****/
                            if (keyValue.presentDate) {
                                /**** converting date of string values into date format ****/
                                // let presentDate = new Date(keyValue.presentDate);
                                let count = (keyValue.calendarSpecificCount) ? keyValue.calendarSpecificCount : -1;
                                let calendarType = (keyValue.calendarSpecificType) ? keyValue.calendarSpecificType : 'days';
                                /***** adding 5:30 hrs to the date to get exact date from the server *****/
                                // let newDate = new Date(Moment(presentDate).add(5, 'hours').add(30, 'minutes'));
                                let finalDate = new Date(Moment(newDate).add(-count, calendarType));
                                filterQuery = { [details.key]: { [Op.between]: [finalDate, newDate] } };
                            } else {
                                /**** converting date of string values into date format for custom date****/
                                // let startDate = new Date(keyValue.startDate);
                                // let endDate = new Date(keyValue.endDate);
                                /***** adding 5:30 hrs to the date to get exact date from the server *****/
                                // let fromDate = new Date(Moment(startDate).add(5, 'hours').add(30, 'minutes'));
                                // let toDate = new Date(Moment(endDate).add(5, 'hours').add(30, 'minutes'));
                                if (keyValue.startDate && keyValue.endDate) {
                                    filterQuery = { [details.key]: { [Op.between]: [fromDate, toDate] } };
                                }
                                /****** date picker is pending ******/
                            }
                        }
                        cndArray.push(filterQuery)
                    }
                    filter1 = data.condition == 'or' ? { [Op.or]: cndArray } : { [Op.and]: cndArray }
                }
                resolve(filter1);
            } catch (error) {
                reject(error);
            }
        });
    }

    /********************************************************
   Purpose: Save column settings
   Parameter:
   {
        key: 'userListing',
       columns: [{key : 'firstName', status: false}, {key : 'lastName', status: false},{key : 'emailId', status: true}]
   }
   Return: JSON String
   ********************************************************/
    saveColumnSettings(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let bodyData = data.bodyData;
                if (bodyData['key']) {
                    let query = { key: bodyData['key'], adminId: bodyData['adminId'] };
                    let columnSettings = await ColumnSettings.findOne({ where: query });
                    if (!_.isEmpty(columnSettings)) {
                        columnSettings = await columnSettings.update(bodyData);
                    } else {
                        columnSettings = await ColumnSettings.create(bodyData);
                    }
                    return resolve({ status: 1, data: columnSettings });
                } else {
                    return resolve({ status: 0, data: 'Key required.' });
                }
            } catch (error) {
                return reject(error);
            }
        });
    }

    /********************************************************
    Purpose: Save template settings
    Parameter:
        {
            key: 'userListing',
            description:"only firstName and emailId",
            color:"#eee",
            columns: [{key : 'firstName', status: false}, {key : 'lastName', status: false},{key : 'emailId', status: true}]
        }
    Return: JSON String
    ********************************************************/
    saveTemplateSettings(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let bodyData = data.bodyData;
                let query = (bodyData.templateId) ? { id: bodyData.templateId } : { key: bodyData['key'], description: bodyData['description'], adminId: bodyData['adminId'] };
                let columnSettings = await TemplateSettings.findOne({ where: query });
                delete bodyData.templateId;
                if (!_.isEmpty(columnSettings)) {
                    columnSettings = await columnSettings.update(bodyData);
                } else {
                    columnSettings = await TemplateSettings.create(bodyData);
                }
                return resolve({ status: 1, data: columnSettings });
            } catch (error) {
                return reject(error);
            }
        });
    }

    /********************************************************
     Purpose: Save filter
     Parameter:
     {
        "filterName": "firstNameFilter",
        "key": 'userListing',
        "filter": [{"firstname": ["Neha","mad"]},{"lastname":["dodla"]}]
     }
     Return: JSON String
     ********************************************************/
    saveFilter(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let bodyData = data.bodyData;
                let query = (bodyData.filterId) ? { id: bodyData.filterId } : { key: bodyData['key'], description: bodyData['description'], adminId: bodyData['adminId'] };
                let filterSettings = await FilterSettings.findOne({ where: query });
                delete bodyData.filterId;
                if (!_.isEmpty(filterSettings)) {
                    filterSettings = await filterSettings.update(bodyData);
                } else {
                    filterSettings = await FilterSettings.create(bodyData);
                }
                return resolve({ status: 1, data: filterSettings });

            } catch (error) {
                return reject(error);
            }
        });
    }

    /************* for downloading csv and excel files ***************/
    downloadFiles(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let bodyData = data.bodyData;
                let model = data.bodyData.model;
                let file = data.bodyData.fileName;
                let query = data.query ? data.query : {};
                let type = data.bodyData.type.toLowerCase();
                // let stages = data.stages ? data.stages : {};
                let selectObj = (data.selectObj) ? { ...data.selectObj } : {};
                let includeCnd = (data.includeCnd) ? data.includeCnd : [];
                let ext = (type === 'csv') ? ('.csv') : (type === 'excel') ? ('.xlsx') : '.pdf';
                if (model.rawAttributes.isDeleted !== undefined) {
                    query.isDeleted = false;
                }

                let listing;
                /*********  Data getting from database begins **********/
                listing = await model.findAll({ attributes: Object.values(selectObj), include: includeCnd, where: { [Op.and]: [query] }, raw: true });
                /*********  Data getting from database ends **********/
                // console.log("listing", listing)

                if (_.isEmpty(listing))
                    return resolve({ status: 0, message: i18n.__('NOT_FOUND') });

                /*********  code for csv and excel download begins **********/
                let fields = bodyData.filteredFields;
                const opts = { fields };
                const filePathAndName = file + '-' + type + '-' + Date.now() + ext;
                const filePath = path.join(__dirname, `../../public/${type}/`, filePathAndName);
                let dirPath = path.join(__dirname, `../../public/${type}/`);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath);
                }
                // console.log("filePath", filePath)
                if (type === 'csv') {
                    const csv = json2csv(listing, opts);
                    fs.writeFile(filePath, csv, function (err) {
                        if (err)
                            return resolve({ status: 0, message: i18n.__('INTERNAL_SERVER_ERROR') });
                    })
                    return resolve({ filePathAndName });
                }
                else if (type === 'excel') {
                    let excel = json2xls(listing, opts);
                    fs.writeFileSync(filePath, excel, 'binary')
                    return resolve({ filePathAndName });
                }
                else if (type === 'pdf') {
                    /***** write pdf generation code here ******/
                    // let pdf = await this.downloadPdf({ listing, filePathAndName, filePath, fields });
                    // return resolve({ ...pdf });
                    let pdfType = await this.downloadPdf({ listing, filePathAndName, filePath, fields });
                    return resolve({ ...pdfType });
                }
                /*********  code for csv and excel download ends **********/

                else {
                    return resolve({ status: 0, message: i18n.__('BAD_REQUEST') + ' of type value' });
                }
            }
            catch (error) {
                return reject(error)
            }
        })
    }

    /****** dynamic code for generating pdf *******/
    async downloadPdf(result) {
        return new Promise(async (resolve, reject) => {
            try {
                let { listing, filePathAndName, filePath, fields } = result;
                let loc = path.join(__dirname, '..', '..', 'public', 'generate-pdf.html');
                let html = fs.readFileSync(loc, 'utf8');
                let tableHeading = "";
                tableHeading += `<tr>`;

                for (let i = 0; i < fields.length; i++) {
                    tableHeading += `<td class="title" width="5%" style="padding: 1px;text-align:center;border: 1px solid #e5e5e5;color:"black";line-height: 1.6;vertical-align: top;">${fields[i]}</td>`
                }
                tableHeading += `</tr>`
                let tableData = "";
                for (let i = 0; i < listing.length; i++) {
                    tableData += `<tr>`;
                    let bodyObj = listing[i];
                    let listingKeys = Object.keys(bodyObj);
                    let listingValues = Object.values(bodyObj);
                    for (let j = 0; j < fields.length; j++) {
                        let index = listingKeys.indexOf(fields[j]);
                        if (index == -1) {
                            tableData += `<td width="5%" style="padding: 1px;text-align:center;border: 1px solid #e5e5e5;line-height: 1.3;vertical-align: middle;color:#595959"> - </td>`
                        } else {
                            tableData += `<td width="5%" style="padding: 1px;text-align:center;border: 1px solid #e5e5e5;line-height: 1.3;vertical-align: middle;color:#595959">
                             ${(listingValues[index] == '') ? '-' : listingValues[index]}
                          </td>`
                        }
                    }
                    tableData += `</tr>`
                }
                html = html.replace('{tableHeading}', tableHeading);
                html = html.replace('{tableBody}', tableData);
                let options = { format: 'A2', border: "1px", timeout: 300000 };
                pdf.create(html, options).toFile(filePath, function (err) {
                    if (err) { reject({ status: 0, message: i18n.__('INTERNAL_SERVER_ERROR') }); }
                    else { return resolve({ filePathAndName }); }
                })

            } catch (error) {
                console.log("error- ", error);
                reject({ status: 0, message: i18n.__('INTERNAL_SERVER_ERROR') });
            }
        })
    }

    /********************************************************
     Purpose:Convert currency
     Parameter:
     {}
     Return: JSON String
     ********************************************************/
    convertCurrency(amount, fromCurrency, toCurrency) {
        return new Promise((resolve, reject) => {
            try {
                let apiKey = '424a618d3b6f3fde2877';
                fromCurrency = encodeURIComponent(fromCurrency);
                toCurrency = encodeURIComponent(toCurrency);
                let query = fromCurrency + '_' + toCurrency;

                let url = 'https://free.currconv.com/api/v7/convert?q=' + query + '&compact=ultra&apiKey=' + apiKey;

                https.get(url, (res) => {
                    let body = '';
                    res.on('data', (chunk) => { body += chunk; });

                    res.on('end', () => {
                        try {
                            let jsonObj = JSON.parse(body);
                            let val = jsonObj[query];
                            if (val) {
                                let total = val * amount;
                                return resolve({ status: 1, data: Math.round(total * 100) / 100 });
                            } else {
                                let err = new Error("Value not found for " + query);
                                return resolve({ status: 0, message: err });
                            }
                        } catch (e) {
                            console.log("Parse error: ", e);
                            return reject(e);
                        }
                    });
                }).on('error', (e) => {
                    console.log("Got an error: ", e);
                    return reject(e);
                });
            } catch (error) {
                return reject(error);
            }
        });
    }

    /********************************************************
     Purpose: Change password validations
     Parameter:
     {
     }
     Return: JSON String
    ********************************************************/
    changePasswordValidation(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let passwordObj = data.passwordObj ? data.passwordObj : {}
                const samePassword = _.isEqual(passwordObj.oldPassword, passwordObj.newPassword);
                if (samePassword) {
                    return resolve({ status: 0, message: i18n.__("OLD_PASSWORD_NEW_PASSWORD_DIFFERENT") });
                }

                const status = await this.verifyPassword({ password: passwordObj.oldPassword, savedPassword: passwordObj.savedPassword });
                if (!status) {
                    return resolve({ status: 0, message: i18n.__("CORRECT_CURRENT_PASSWORD") });
                }

                let isPasswordValid = await this.validatePassword({ password: passwordObj.newPassword });
                if (isPasswordValid && !isPasswordValid.status) {
                    return resolve(isPasswordValid);
                }

                let password = await this.ecryptPassword({ password: passwordObj.newPassword });
                return resolve(password);
            } catch (error) {
                return reject(error);
            }
        });
    }

    /********************************************************
    Purpose:Convert Excel sheet to Json format
    Parameter:
    {}
    Return: JSON String
    ********************************************************/
    async convertExcelToJson(fileData) {
        return new Promise(async (resolve, reject) => {
            try {
                let data = fileData.file[0].path;
                xlsxj({ input: data, output: null }, (err, result) => {
                    if (err) {
                        return reject(err)
                    } else {
                        return resolve(result) // need to write our logic to dump the data into database
                    }
                });

            } catch (error) {
                console.log("error- ", error);
                reject({ status: 0, message: error });
            }
        })
    }

    /********************************************************
     Purpose: Upload csv file path and covert into json and save user in database with unique emailId
     Parameter:
     {

     }
     Return: JSON String
     ********************************************************/
    async convertCsvToJson(fileData) {
        return new Promise(async (resolve, reject) => {
            try {
                const file = new File(fileData);
                let data = await file.readFile(fileData.file[0].path);
                let options = {
                    delimiter: ',', // optional
                    quote: '"' // optional
                }
                let jsonData = csvjson.toObject(data, options);
                return resolve(jsonData)
            } catch (error) {
                console.log("error- ", error);
                return reject({ status: 0, message: 'Internal server error.' });
            }
        })
    }

    /********************************************************
     Purpose: notification to admin
     Return: JSON String
     ********************************************************/
    sendNotificationToAdmin(data) {
        return new Promise(async (resolve, reject) => {
            try {
                let template = await NotificationTemplateSchema.findOne({ raw: true, where: { templateKey: data.templateKey, status: true } });
                if (template) {
                    let addData = {
                        type: template.templateType,
                        subType: template.templateKey,
                        title: Mustache.render(template.title, data.replaceDataObj),
                        message: Mustache.render(template.message, data.replaceDataObj),
                        dataId: data.dataId,
                        userType: data.userType,
                        userId: data.userId,
                        image: template.image
                    }
                    await NotificationAdminSchema.create(addData);
                    return resolve({ status: 1 })
                } else {
                    return resolve({ status: 0, message: "Template not found" })
                }
            } catch (error) {
                return reject(error)
            }
        });
    }

}

module.exports = Common;