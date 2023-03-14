FROM docker.indianic.com/library/node:12.16.0

WORKDIR /usr/src/app

COPY ./package.json ./package.json

RUN npm install -g nodemon

EXPOSE 5010

CMD ["npm", "start"]

