/****************************
 EMAIL HANDLING OPERATIONS
 ****************************/
// let mail = require('nodemailer').mail;
//let nodemailer = require('nodemailer');
const config = require("../../configs/configs");
const Users = require('../modules/User/Schema').Users;
const path = require('path');
const stripe = require('stripe')(config.stripeSecretKey);
const exportLib = require('../../lib/Exports');

class Strip {

    constructor() {

    }
   
    /********************************************************
    Purpose:created customer in strip payment gateway
    Return: true/false
    ********************************************************/
    createCustomer(data) {
      //  console.log(phoneNo);
        return new Promise(async (resolve, reject) => {

            try{
                    const customer = await stripe.customers.create({
                        description: 'Foodjin aap customer register',
                        email:data.emailId,
                        phone:data.mobile
                    })
                    if(customer)
                    {
                            resolve(customer);
                    }   
            }
            catch(error)
            {
                console.log(error)
                return exportLib.Error.handleError(this.res, { status: true, code: 'INTERNAL_SERVER_ERROR', message: 'INTERNAL_SERVER_ERROR'});
            } 
        })
    }
    /********************************************************
    Purpose:added credit cart or debit card in stripe payment gateway
    Return: true/false
    ********************************************************/
    addCard(data) 
    {
        return new Promise(async (resolve, reject) => {

            try {
                        //decrypted credit card values 
                        const crypto = require('crypto');
                        const key = "(G+KbPeSgVkYp3s6v9y$B&E)H@McQfTj";
                        //const iv = "-JaNdRgUkXp2s5v8";
                        
                        
                        function decrypt(text) {
                        let iv = Buffer.from("-JaNdRgUkXp2s5v8", 'UTF-8');
                        let encryptedText = Buffer.from(text, 'base64');
                        let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
                        let decrypted = decipher.update(encryptedText);
                        decrypted = Buffer.concat([decrypted, decipher.final()]);
                        return decrypted.toString();
                        }
                        
                        let creditCard = decrypt(data.creditCardNumber)
                        let expMonth = decrypt(data.expMonth)
                        let expYear = decrypt(data.expYear)
                        let cvc = decrypt(data.cvc)

                        //first created token 
                        const token = await stripe.tokens.create({
                            card: {
                            number: creditCard,
                            exp_month:expMonth,
                            exp_year: expYear,
                            name:data.name,
                            cvc: cvc,
                            },
                        });
                       
                    //save the card in stripe    
                    const card = await stripe.customers.createSource(
                        data.stripeCustomerId,
                        {source: token.id}
                    );
                   
                    if(card)
                    {
                        resolve(true)

                    }  
                    else
                    {
                        resolve(false)
                    }
                }
                catch(error)
                {
                    console.log(error,'error')
                    return reject(error.message);
                                } 


        })   
         
    }
    /********************************************************
    Purpose:getting card listing in stripe payment gateway
    Return: true/false
    ********************************************************/
    getCard(data) 
    {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(data.stripeCustomerId,'data.stripeCustomerId.toString()')
                const getCard = await stripe.customers.listSources(
                    data.stripeCustomerId,
                    {object: 'card', limit: 20}
                  );
                    if(getCard)
                    {
                        resolve(getCard);
                    }  
                }     
            catch(error)
            {
                console.log(error,'error')
                    return reject(error.message);
                     } 

        })   
         
    }
    /********************************************************
    Purpose:updated default card status value in stripe payment gateway
    Return: true/false
    ********************************************************/

      updateCreditCardStatus(data) 
    {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(data.stripeCustomerId.toString(),'data.stripeCustomerId.toString()')
                const customer = await stripe.customers.update( data.stripeCustomerId, {
                    default_source:data.cardId
                  })
                  if(customer)
                  {
                      resolve(true)

                  }

                }   
            catch(error)
            {
                console.log(error,'error')
                    return reject(error.message);   } 

        })   
         
    }


    /********************************************************
    Purpose:updated default card status value in stripe payment gateway
    Return: true/false
    ********************************************************/
   payment(data) 
   {
       return new Promise(async (resolve, reject) => {
           try {
               console.log(data.customerId,'data.stripeCustomerId.toString()')
               const paymentIntent = await stripe.paymentIntents.create({
                amount: data.amount,
                currency: 'usd',
                source: data.cardId,
                payment_method_types: ['card'],
                customer:data.customerId,// 'cus_IK0nDfgIa29n05',
                capture_method: 'manual' ,// by default it is automatic, 
                confirm: true,
                confirmation_method: 'manual',
                save_payment_method: true,
                setup_future_usage: 'off_session',
                off_session: false,
            });
            console.log(paymentIntent,'payment')
                 if(paymentIntent)
                 {
                     resolve(paymentIntent)

                 }

               }   
           catch(error)
           {
            console.log(error,'error')
            return reject(error.message);       } 

       })   
        
   }
   
    /********************************************************
    Purpose:delete card  in stripe payment gateway
    Return: true/false
    ********************************************************/
   deleteCreditCard(data) 
   {
       return new Promise(async (resolve, reject) => {
           try {
               console.log(data.stripeCustomerId.toString(),'data.stripeCustomerId.toString()')
               const customer = await stripe.customers.deleteSource( data.stripeCustomerId,data.cardId)
                 if(customer)
                 {
                     resolve(true)

                 }

               }   
           catch(error)
           {
            console.log(error,'error')
            return reject(error.message); } 

       })   
        
   }


}

module.exports = Strip;