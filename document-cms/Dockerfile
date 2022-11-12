# development builder
FROM node:16 AS development

COPY package*.json ./

RUN npm config set fetch-retry-mintimeout 1000000000
RUN npm config set fetch-retry-maxtimeout 6000000000

# USER node

RUN npm install --loglevel info

RUN npm install --loglevel=info --arch=arm64 --platform=linuxmusl sharp

COPY . .

RUN npm run build

# development runner (ARM/M1 compatible)
FROM --platform=linux/amd64 node:16 AS runner

WORKDIR /opt/app

USER node

COPY --chown=node:node --from=development . .

CMD [ "npm", "run", "develop" ]

## -----------------------------------------------------

# FROM node:16-alpine as development
# # Installing libvips-dev for sharp Compatibility
# RUN apk update && apk add  build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev
# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}
# WORKDIR /opt/app
# RUN chown -R node:node .
# USER node
# COPY . .
# RUN rm -rf node_modules
# RUN npm config set fetch-retry-mintimeout 1000000000
# RUN npm config set fetch-retry-maxtimeout 6000000000
# RUN npm config set fetch-retires 10
# RUN npm install --arch=x64 --platform=linux --libc=glibc sharp --unsafe-perm --loglevel info
# RUN npm install --unsafe-perm --loglevel info
# # RUN npm uninstall --loglevel info sharp 
# # RUN npm install --loglevel info --ignore-scripts=false --foreground-scripts --arch=arm64 --platform=linuxmusl sharp
# RUN npm run build
# CMD ["npm", "run", "develop"]

## ----------------------------------------------

# FROM --platform=arm64 node:16-alpine
# # Installing libvips-dev for sharp Compatibility
# RUN apk update && apk add  build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev
# ARG NODE_ENV=development
# ENV NODE_ENV=${NODE_ENV}
# WORKDIR /opt/
# USER node
# COPY ./package*.json ./
# # COPY ./package.json ./yarn.lock ./
# ENV PATH /opt/node_modules/.bin:$PATH
# RUN yarn config set network-timeout 60000000 -g && yarn install
# WORKDIR /opt/app
# COPY ./ .
# USER node
# RUN yarn build
# EXPOSE 1337
# CMD ["yarn", "develop"]


## ------------------------------

# development builder
# FROM node:16-bullseye-slim AS development

# COPY package*.json ./

# RUN npm install

# RUN npm install --arch=arm64 --platform=linuxmusl sharp

# COPY . .

# RUN npm run build

# # development runner (ARM/M1 compatible)
# FROM --platform=linux/amd64 node:16-bullseye AS runner

# COPY --from=development . .

# WORKDIR /usr/src/app