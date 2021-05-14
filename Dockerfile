FROM node:8.6 as build

WORKDIR /videochat
COPY package.json /videochat/
RUN npm install

COPY ./ /videochat

ARG VUE_APP_SOCKET_HOST=https://posturing.herokuapp.com
ARG VUE_APP_SOCKET_PORT=443
RUN export VUE_APP_SOCKET_HOST=${VUE_APP_SOCKET_HOST} VUE_APP_SOCKET_PORT=${VUE_APP_SOCKET_PORT} && npm run build

CMD ["npm", "run", "run:server"]
