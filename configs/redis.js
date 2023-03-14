/****************************
 MYSQL SEQUELIZE CONNECTION
 ****************************/
let config = require('./configs');
const redis = require('redis');


module.exports = async () => {
    
        
        const client = redis.createClient({
            host: config.redisUrl,
            port:config.redisPort,
            password: config.redisPassword
          });

          client.on("error", (error) => {
            console.log("error", error);
            });
            client.on('connect', () => {
            console.log("Redis connected successfully .....");
            });
          return client;
    
    //return client;
};