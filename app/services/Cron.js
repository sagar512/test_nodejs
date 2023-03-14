/****************************
 SCHEDULE CRON JOBS
 ****************************/
const cron = require('node-cron');
const _ = require("lodash");

class Cron {

    constructor() { }

    scheduleCronJobs() {
        console.log('scheduleCronJobs');
        cron.schedule('* * * * *', async () => {
            try {
                console.log("YUhhhh, crop job running in every minutes");
            } catch (error) {
                console.log('error in cron', error);
            }
        });
    }
}

module.exports = Cron;