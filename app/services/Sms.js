/****************************
 EMAIL HANDLING OPERATIONS
 ****************************/
// let mail = require('nodemailer').mail;
//let nodemailer = require('nodemailer');
const config = require("../../configs/configs");
const Users = require('../modules/User/Schema').Users;
const File = require('./File');
const path = require('path');
const _ = require('lodash');

var twilio = require('twilio')(config.twilioAccountSid, config.twilioAuthToken);


class Sms {

    constructor() {

    }
    addMintues(minutes) {
        var date = new Date();
        return date.getTime() + minutes * 60000;
    }

    sendOtp(phoneNo, userId, dialcode,OTP) {
      //  console.log(phoneNo);
        return new Promise(async (resolve, reject) => {
          
            var timestamp = Date.now();
            var otpObject = {};
            otpObject.mobile = phoneNo;
           // var otpdata = Math.floor(1000 + Math.random() * 9000);
            otpObject.verificationCode = OTP;
            otpObject.userId = userId;
            otpObject.updatedAt = timestamp;
            otpObject.createdAt = timestamp;
            otpObject.expireVerificationCode = this.addMintues(15);
            // console.log("otp",otpObject);
            // var otp = new Otps(otpObject);

            console.log("otpObject")
            console.log(otpObject)
            let query = { where: { id: otpObject.userId } };
            let userData = await Users.update(otpObject, query);
            if (!_.isEmpty(userData)) {
                console.log("sendOTP::users::update::userData")
                console.log(userData)
                let resData = { "otp": OTP, "userId": userId };
                resolve({otpdata: resData })
            }
            // Users.update(query, { $set: otpObject },async function (err1, result) {
            //
            // })
            let message = "Your Foodjin verification code is: "+ OTP +" and this code will expire after 15 minutes.";
            await this.sendSms(dialcode,phoneNo,message)
            
        });
    }

    sendSms(countryCode,phoneNumber,message) {
    	    twilio.messages.create({
    	        to: countryCode + phoneNumber.replace(/\D/g, ''),
    	        from: "+" + config.twilioPhoneNumber.replace(/\D/g, ''),
    	        body: message
    	    }).then(Sendmessage => {
                console.log("Sendmessage")
                console.log(Sendmessage)
            })
                .catch(err => console.log("Twilio::Err", err))
            .done();
         
    }

    // function addMintues(minutes) {
    //     var date = new Date();
    //     return date.getTime() + minutes*60000;
    // }
    // function sendSms (bodyData){
    // 	return new Promise((resolve, reject) => {
    // 		fetch('http://107.20.199.106/restapi/sms/1/text/single', {
    // 			method: 'POST',
    // 			headers: {'Content-Type': 'application/json','Authorization':'Basic VlNMVEQ6VmlydHVhbEAxOA=='},
    // 			body:JSON.stringify(bodyData)
    // 		}).then(response => {
    // 			resolve(response.json());
    // 		}).catch(err => {resolve({status:3})});      
    // 	})
    // }
    // exports.sendSms = function(bodyData){
    // 	fetch('http://107.20.199.106/restapi/sms/1/text/single', {
    // 		method: 'POST',
    // 		headers: {'Content-Type': 'application/json','Authorization':'Basic VlNMVEQ6VmlydHVhbEAxOA=='},
    // 		body:JSON.stringify(bodyData)
    // 	}).then(response => {
    // 	}).catch(err => {resolve({status:3})});      
    // }

    // async function sendOtpSms(phoneNumber,message) {
    //     return new Promise((resolve, reject) => {
    // 	    twilio.sendSms({
    // 	        to: "+" + phoneNumber.replace(/\D/g, ''),
    // 	        from: config.twilioPhoneNumber.replace(/\D/g, ''),
    // 	        body: message
    // 	    }, function(err, responseData) {
    // 	        return resolve(responseData.json());
    // 	    });
    //     })
    // }
   


}

module.exports = Sms;