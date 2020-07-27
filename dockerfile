FROM node:10
# Install GraphicsMagik
RUN apt-get update && apt-get install graphicsmagick -y
# this should be changed to not root
RUN npm -g config set user root
# Needed for sqlite install
RUN npm install -g npm-install-peers
COPY package.json .

RUN npm install
RUN npm i sqlite3

COPY . .

ENTRYPOINT [ "node", "app.js" ]