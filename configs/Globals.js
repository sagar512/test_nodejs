/****************************
 SECURITY TOKEN HANDLING
 ****************************/
const _ = require('lodash');
const Moment = require('moment');
const i18n = require("i18n");
let jwt = require('jsonwebtoken')

const config = require('./configs');
const Authentication = require('../app/modules/Authentication/Schema').Authtokens;
const Users = require('../app/modules/User/Schema').Users;
const Admin = require('../app/modules/Admin/Schema').Admin;
//const RolesSchema = require('../app/modules/Roles/Schema').RolesSchema;
//const PermissionsSchema = require('../app/modules/Roles/Schema').PermissionsSchema;
const Model = require('../app/modules/Base/Model');
const exportLib = require('../lib/Exports');

class Globals {

    // Generate Token
    getToken(params) {
        return new Promise(async (resolve, reject) => {
            try {
                // Generate Token
                let token = jwt.sign({
                    id: params.id,
                    algorithm: "HS256",
                    exp: Math.floor(Date.now() / 1000) + parseInt(config.tokenExpiry)
                }, config.securityToken);

                params.token = token;
                params.userId = params.id;
                params.tokenExpiryTime = Moment().add(parseInt(config.tokenExpirationTime), 'minutes');
                delete params.id
                let updateUser = await Authentication.findOne({ where: { userId: params.userId } });
                if (_.isEmpty(updateUser)) {
                    await Authentication.create(params);
                } else {
                    await Authentication.update(params, { where: { userId: params.userId } });
                }
                return resolve(token);
            } catch (err) {
                console.log("Get token", err);
                return reject({ message: err, status: 0 });
            }
        });
    }
    // Generate Token
    getTokenWithRefreshToken(params) {
        return new Promise(async (resolve, reject) => {
            try {
                // Generate Token
                let token = jwt.sign({
                    id: params.id,
                    algorithm: "HS256",
                    exp: Math.floor(Date.now() / 1000) + parseInt(config.tokenExpiry)
                }, config.securityToken);

                // Generate refreshToken
                let refreshToken = jwt.sign({
                    id: params.id,
                    algorithm: "HS256",
                    exp: Math.floor(Date.now() / 1000) + parseInt(config.tokenExpiry)
                }, config.securityRefreshToken);

                params.token = token;
                params.userId = params.id;
                params.refreshToken = refreshToken;
                params.tokenExpiryTime = Moment().add(parseInt(config.tokenExpirationTime), 'minutes');
                delete params.id;
                // await Authentication.findOneAndUpdate({ userId: params.userId }, params, { upsert: true, new: true });

                let updateUser = await Authentication.findOne({ where: { userId: params.userId } });
                if (_.isEmpty(updateUser)) {
                    await Authentication.create(params);
                } else {
                    await Authentication.update(params, { where: { userId: params.userId } });
                }
                return resolve({ token, refreshToken });
            } catch (err) {
                console.log("Get token", err);
                return reject({ message: err, status: 0 });
            }
        });
    }


    AdminToken(params) {
        return new Promise(async (resolve, reject) => {
            try {
                let token = jwt.sign({
                    id: params.id,
                    algorithm: "HS256",
                    exp: Math.floor(Date.now() / 1000) + parseInt(config.tokenExpiry)
                }, config.securityToken);

                params.token = token;
                params.adminId = params.id;
                params.tokenExpiryTime = Moment().add(parseInt(config.tokenExpirationTime), 'minutes');
                delete params.id;
                const d = await Authentication.findOne({ where: { ipAddress: params.ipAddress, adminId: params.adminId } });
                if (_.isEmpty(d)) {
                    await Authentication.create(params);
                } else {
                    await Authentication.update(params, { where: { id: d.id } });
                }
                return resolve(token);
            } catch (err) {
                console.log("Get token", err);
                return reject({ message: err, status: 0 });
            }

        });
    }

    generateToken(id) {
        return new Promise(async (resolve, reject) => {
            try {
                let token = jwt.sign({
                    id: id,
                    algorithm: "HS256",
                    exp: Math.floor(Date.now() / 1000) + parseInt(config.tokenExpiry)
                }, config.securityToken);

                return resolve(token);
            } catch (err) {
                console.log("Get token", err);
                return reject({ message: err, status: 0 });
            }

        });
    }
    // Validating Token
    static async isAuthorized(req, res, next) {
        try {
            const token = req.headers.authorization;
            if (!token)  return exportLib.Error.handleError(res, { status: false, code: 'UNAUTHORIZED', message: exportLib.ResponseEn.TOKEN_WITH_API });
           

            const authenticate = new Globals();

            const tokenCheck = await authenticate.checkTokenInDB(token);
            if (!tokenCheck) return exportLib.Error.handleError(res, { status: false, code: 'UNAUTHORIZED', message: exportLib.ResponseEn.INVALID_TOKEN });
            

            // const tokenExpire = await authenticate.checkExpiration(token);
            // if (!tokenExpire) return res.status(401).json({ status: 0, message: i18n.__("TOKEN_EXPIRED") });

            const userExist = await authenticate.checkUserInDB(token);
            if (!userExist) return exportLib.Error.handleError(res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.USER_NOT_EXIST });
            if (userExist.status == 'Inactive') return exportLib.Error.handleError(res, { status: false, code: 'NOT_FOUND', message: exportLib.ResponseEn.INACTIVE_ACCOUNT });
           
            req.currentUser = userExist
            // if (req.originalUrl) {
            //     let pathParams = req.originalUrl.split("/");
            //     if (!pathParams || (pathParams && Array.isArray(pathParams) && _.last(pathParams) && !_.isEqual(_.last(pathParams), 'changePassword'))) {
            //         if (config.forceToUpdatePassword && config.forceToUpdatePassword == 'true') {
            //             let shouldPasswordNeedToUpdate = await authenticate.checkPasswordExpiryTime({ userObj: userExist.dataValues });
            //             if (shouldPasswordNeedToUpdate) {
            //                 return res.json({ status: 0, message: i18n.__("FORCE_PASSWORD_CHANGE") });
            //             }
            //         }
            //     }
            // }
            // if (userExist.dataValues.id) {
            //     req.currentUser = userExist;
            //     if (config.extendTokenTime && config.extendTokenTime == 'true') {
            //         await authenticate.extendTokenTime(userExist.dataValues.id);
            //     }
            // }

            next();
        } catch (err) {
            console.log("Token authentication", err);
            return res.send({ status: 0, message: err });
        }
    }
    static async isValid(req, res, next) {
        try {
            if (config.useRefreshToken && config.useRefreshToken != 'true') {
                return res.status(401).json({ status: 0, message: 'Not authorized to refresh token.' });
            }
            next();
        } catch (err) {
            console.log("isValid", err);
            return res.send({ status: 0, message: err });
        }
    }
    async extendTokenTime(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                //const authenticate = await Authentication.findOne({ userId: userId });
                const authenticate = await Authentication.findOne({ where: { userId: userId } });
                if (authenticate && authenticate.tokenExpiryTime) {
                    let expiryDate = Moment(authenticate.tokenExpiryTime).subtract(2, 'minutes')
                    let now = Moment();
                    if (now > expiryDate) {
                        //await Authentication.findOneAndUpdate({ userId: userId }, { tokenExpiryTime: Moment(authenticate.tokenExpiryTime).add(parseInt(config.tokenExpirationTime), 'minutes') });
                        await Authentication.update({ tokenExpiryTime: Moment(authenticate.tokenExpiryTime).add(parseInt(config.tokenExpirationTime), 'minutes') }, { where: { userId: userId } });

                    }
                }
                return resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
    async checkPasswordExpiryTime(data) {
        return new Promise(async (resolve, reject) => {
            try {
                if (data && data.userObj && data.userObj.passwordUpdatedAt) {
                    let lastChangedDate = Moment(data.userObj.passwordUpdatedAt, 'YYYY-MM-DD HH:mm:ss');
                    let currentDate = Moment(new Date(), 'YYYY-MM-DD HH:mm:ss');
                    let duration = Moment.duration(currentDate.diff(lastChangedDate));
                    let months = duration.asMonths();
                    if (months >= parseInt(config.updatePasswordPeriod)) {
                        return resolve(true);
                    }
                    return resolve(false);
                }
                return resolve()
            } catch (error) {
                return reject(error);
            }
        });
    }

    static isAdminAuthorised(resource) {
        return async (req, res, next) => {
            try {
                const token = req.headers.authorization;
                if (!token) return res.status(401).json({ status: 0, message: i18n.__("TOKEN_WITH_API") });

                const authenticate = new Globals();

                const tokenCheck = await authenticate.checkTokenInDB(token);
                if (!tokenCheck) return res.status(401).json({ status: 0, message: i18n.__("INVALID_TOKEN") });

                const tokenExpire = await authenticate.checkExpiration(token);
                if (!tokenExpire) return res.status(401).json({ status: 0, message: i18n.__("TOKEN_EXPIRED") });

                const userExist = await authenticate.checkAdminInDB(token);
                if (!userExist) return res.status(401).json({ status: 0, message: i18n.__("ADMIN_NOT_EXIST") });

                if (userExist.id) {
                    req.currentUser = userExist;
                    // Check admin is authorized to access API
                    if (resource && resource.length && userExist.Role && userExist.Role.id) {
                        let role = await RolesSchema.findOne({
                            include: PermissionsSchema,
                            where: { id: userExist.Role.id }
                        });
                        if (role && role.Permissions) {
                            let permissions = _.map(role.Permissions, 'permissionKey');
                            if (_.difference(resource, permissions).length != 0) {
                                return res.status(401).json({ status: 0, message: i18n.__("UNAUTHORIZED_TO_ACCESS") });
                            }
                        } else {
                            return res.status(401).json({ status: 0, message: i18n.__("UNAUTHORIZED_TO_ACCESS") });
                        }
                    }
                }
                next();
            } catch (err) {
                console.log("Token authentication", err);
                return res.send({ status: 0, message: err });
            }
        }

    }
    // Check User Existence in DB
    checkUserInDB(token) {
        return new Promise(async (resolve, reject) => {
            try {
                // Initialisation of variables
                let decoded = jwt.decode(token);
                if (!decoded) { return resolve(false); }
                let userId = decoded.id

                const user = await Users.findOne({ where: { id: userId} });
                if (user) return resolve(user);
                return resolve(false);

            } catch (err) {
                console.log("Check user in db")
                return reject({ message: err, status: 0 });
            }

        })
    }
    //Check admin in db
    checkAdminInDB(token) {
        return new Promise(async (resolve, reject) => {
            try {
                // Initializations of variables
                let decoded = jwt.decode(token);
                if (!decoded) { return resolve(false); }
                let adminId = decoded.id
                const user = await Admin.findOne({
                    include: RolesSchema,
                    where: { id: adminId, isDeleted: false }
                });
                if (user) { return resolve(user); }
                return resolve(false);
            } catch (err) {
                console.log("Check ADMIN in db")
                return reject({ message: err, status: 0 });
            }
        })
    }
    // Check token in DB
    checkTokenInDB(token) {
        return new Promise(async (resolve, reject) => {
            try {
                let tokenDetails = Buffer.from(token, 'binary').toString();
                // Initializations of variables
                var decoded = jwt.verify(tokenDetails, config.securityToken, { ignoreExpiration: true });
                if (_.isEmpty(decoded)) {
                    return resolve(false);
                }
                const authenticate = await Authentication.findOne({ where: { token: tokenDetails } });
                if (authenticate) return resolve(true);
                return resolve(false);
            } catch (err) {
                return resolve({ message: err, status: 0 });
            }
        })
    }
    // Check Token Expiration
    checkExpiration(token) {
        return new Promise(async (resolve, reject) => {
            let tokenDetails = Buffer.from(token, 'binary').toString();
            let status = false;
            const authenticate = await Authentication.findOne({ where: { token: tokenDetails } });
            if (authenticate && authenticate.tokenExpiryTime) {
                let expiryDate = Moment(authenticate.tokenExpiryTime, 'YYYY-MM-DD HH:mm:ss')
                let now = Moment(new Date(), 'YYYY-MM-DD HH:mm:ss');
                if (expiryDate > now) { status = true; resolve(status); }
            }
            resolve(status);
        })
    }
    refreshAccessToken(refreshtoken) {
        return new Promise(async (resolve, reject) => {
            // Initialisation of variables
            let decoded = jwt.decode(refreshtoken);
            if (!decoded) { return resolve({ status: 0, message: "Invalid refresh token." }); }
            let userId = decoded.id
            const authenticationData = await Authentication.findOne({ userId: userId });
            if (authenticationData && authenticationData.tokenExpiryTime) {
                let expiryDate = Moment(authenticationData.tokenExpiryTime, 'YYYY-MM-DD HH:mm:ss')
                let now = Moment(new Date(), 'YYYY-MM-DD HH:mm:ss');
                if (expiryDate > now) {
                    return resolve({ status: 0, message: "Access token is not expired yet." });
                } else {
                    const authenticate = new Globals();
                    const { token, refreshToken } = await authenticate.getTokenWithRefreshToken({ id: authenticationData.userId });
                    return resolve({ status: 1, message: "Token refreshed.", access_token: token, refreshToken: refreshToken });
                }
            }

            else {
                return resolve({ status: 0, message: "Wrong refresh token." });
            }
        });
    }
    static decodeAdminForgotToken(token) {
        return new Promise(async (resolve, reject) => {
            const admin = await Admin.findOne({ where: { forgotToken: token } });
            if (admin && admin.forgotTokenCreationTime && parseInt(config.forgotTokenExpireTime)) {
                let expiryDate = Moment(admin.forgotTokenCreationTime).add(parseInt(config.forgotTokenExpireTime), 'minutes');
                let now = Moment();
                if (expiryDate < now) {
                    return resolve(false);
                }
            }
            return resolve(true);
        });
    }
    static decodeUserForgotToken(token) {
        return new Promise(async (resolve, reject) => {
            const user = await Users.findOne({ where: { forgotToken: token } });
            if (user && user.forgotTokenCreationTime && parseInt(config.forgotTokenExpireTime)) {
                let expiryDate = Moment(user.forgotTokenCreationTime).add(parseInt(config.forgotTokenExpireTime), 'minutes');
                let now = Moment();
                if (expiryDate < now) {
                    return resolve(false);
                }
            }
            return resolve(true);
        });
    }

    static decodeUserVerificationToken(token) {
        return new Promise(async (resolve, reject) => {
            const user = await Users.findOne({ where: { verificationToken: token } });
            if (user && user.verificationTokenCreationTime && parseInt(config.verificationTokenExpireTime)) {
                let expiryDate = Moment(user.verificationTokenCreationTime).add(parseInt(config.verificationTokenExpireTime), 'minutes');
                let now = Moment();
                if (expiryDate < now) {
                    return resolve(false);
                }
            }
            return resolve(true);
        });
    }
}

module.exports = Globals;
