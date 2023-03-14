/****************************
 SERVER MAIN FILE
 ****************************/

// need to add in case of self-signed certificate connection
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
//let redis = require('./configs/redis');
 //redis();
// Include Modules
let exp = require('express');
let path = require('path');
let fs = require('fs');
let https = require('https');
let i18n = require("i18n");

let config = require('./configs/configs');
let express = require('./configs/express');
let databaseConnection = require('./configs/database');
db = databaseConnection();
let cronService = require('./app/services/Cron');
let CommonService = require('./app/services/Common');
let seedService = require('./app/services/Seed');


i18n.configure({
    locales: ['en', 'es', 'de'],
    directory: __dirname + '/app/locales',
    defaultLocale: 'en',
});
let swaggerUi = require('swagger-ui-express');

// HTTP Authentication
var basicAuth = require('basic-auth');
var auth = function (req, res, next) {
    var user = basicAuth(req);
    if (!user || !user.name || !user.pass) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        res.sendStatus(401);
        return;
    }
    if (user.name === config.HTTPAuthUser && user.pass === config.HTTPAuthPassword) {
        next();
    } else {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        res.sendStatus(401);
        return;
    }
}

global.appRoot = path.resolve(__dirname);

const app = express();

app.get('/', function (req, res, next) {
    res.send('customer-service');
});

/* Old path for serving public folder */
app.use('/public', exp.static(__dirname + '/public'));

if (process.env.NODE_ENV !== "production") {
    var options = {
        customCss: '.swagger-ui .models { display: none }'
    };
    let mainSwaggerData = JSON.parse(fs.readFileSync('swagger.json'));
    mainSwaggerData.host = config.host;
    // mainSwaggerData.host = config.host + ':' + config.serverPort; 
    mainSwaggerData.basePath = config.baseApiUrl;

    const modules = './app/modules';
    fs.readdirSync(modules).forEach(file => {
        if (fs.existsSync(modules + '/' + file + '/swagger.json')) {
            const stats = fs.statSync(modules + '/' + file + '/swagger.json');
            const fileSizeInBytes = stats.size;
            if (fileSizeInBytes) {
                let swaggerData = fs.readFileSync(modules + '/' + file + '/swagger.json');
                swaggerData = swaggerData ? JSON.parse(swaggerData) : { paths: {}, definitions: {} };
                mainSwaggerData.paths = { ...swaggerData.paths, ...mainSwaggerData.paths };
                mainSwaggerData.definitions = { ...swaggerData.definitions, ...mainSwaggerData.definitions };
            }
        }
    });
    if (config.isHTTPAuthForSwagger && config.isHTTPAuthForSwagger == 'true') {
        app.get("/docs", auth, (req, res, next) => {
            next();
        });
    }
    let swaggerDocument = mainSwaggerData;
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
}

// to run cron job if any
// (new cronService()).scheduleCronJobs();

// to seed data for first time
// (new seedService()).seedData();
//const rediss = require('socket.io-redis');



// const redis = require('redis');

// const client = redis.createClient({
//     host: config.redisUrl,
//     port:config.redisPort,
//     password: config.redisPassword
//   });
//   var io = require('socket.io-emitter')(client);
// client.on("error", (error) => {
// console.log("error", error);
// });
// client.on('connect', () => {
// console.log("Redis connected successfully .....");
// });

//     client.get(3, (err, getCacheData) => {
//     if (err) {
//     return reject(err);
//     }
//     //console.log("socket io == > ",io)
//     io.to(getCacheData).emit('welcomeMsg', "emit successfully");
//     console.log("getCacheData", getCacheData);
   
//     });

function onError(err){
  console.log(err);
}

// Listening Server
app.listen(parseInt(config.serverPort), async () => {
    console.log('process.env.NODE_ENV', process.env.NODE_ENV);
    console.log(`Server running at http://localhost:${config.serverPort}`);
});
