/****************************
 MYSQL SEQUELIZE CONNECTION
 ****************************/
let config = require('./configs');
const { Sequelize, DataTypes, Op } = require('sequelize');
let fs = require('fs');
let path = require('path');
const glob = require('glob');

module.exports = async() => {
    try {
        const sequelizeConnection = new Sequelize(config.db, {
            logging: false
        });
        sequelizeConnection
            .authenticate()
            .then(() => {
                console.log('Connection to Database has been established successfully :)');
            })
            .catch(error => {
                console.error('Unable to connect to the database :( \n', error);
            });

        // adding database variable in global to access in schema and db queries
        global.Sequelize = Sequelize;
        global.Op = Op;
        global.DataTypes = DataTypes;
        global.sequelizeConnection = sequelizeConnection;

        // getting all model schema and set their relation
        let db = {};
        let modules = '/../app/modules';
        let schemaFiles = glob.sync(__dirname + modules + '/**/*Schema.js');
        schemaFiles.forEach((schema) => {
            let models = require(schema);
            db = {...db, ...models };
        });

        Object.keys(db).forEach(modelName => {
            if (db[modelName].associate) {
                db[modelName].associate(db);
            }
        });

        // uncomment below line to create database table as per model schema
        // await db['RatingUser//'].sync({ alter: true});
        //await db['Order'].sync({ alter: true });
        //await sequelizeConnection.sync();
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
    return sequelizeConnection;
};