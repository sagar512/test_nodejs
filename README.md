# IndiaNIC Node Project

## Prequisites (Development):

| Module | Version |
| --- | --- |
| Node | 12.16.0 |
| Npm | 6.13.0 |
| sequelize | ^6.3.2 |


##### Take Clone of project
> git clone -b git_url  folder_name


##### Rename configSample.js to configs.js
> cd configs
> mv configSample.js configs.js

##### Change the url of database and set credential if applicable
> vi configs.js

##### Install node modules

> npm install

##### Deployment

>pm2 start server.js --name="common_seed_node_mysql_v12"

