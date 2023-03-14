FROM acrnodeaapimage.azurecr.io/node:12.16.0

WORKDIR /usr/src/app

COPY ./package.json ./package.json

RUN npm install

COPY . .

RUN cp .env.dev .env

RUN cp ./configs/cofingProdSample.js ./configs/configs.js

EXPOSE 5014

CMD ["npm", "start"]
