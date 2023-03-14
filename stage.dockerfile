FROM node:12.16.0

WORKDIR /usr/src/app

COPY ./package.json ./package.json

RUN npm install

COPY . .

RUN cp .env.dev .env

RUN cp ./configs/configSample.js ./configs/configs.js

EXPOSE 5010

CMD ["npm", "start"]
