FROM --platform=linux/amd64 node:16-alpine as development
# Installing libvips-dev for sharp Compatibility
# RUN apk update && apk add  build-base gcc autoconf automake zlib-dev libpng-dev nasm bash vips-dev
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/app
COPY . .
RUN rm -rf node_modules
RUN npm config set fetch-retry-mintimeout 1000000000
RUN npm config set fetch-retry-maxtimeout 6000000000
RUN npm config set fetch-retires 10
RUN npm install --loglevel info
RUN npm uninstall --loglevel info sharp 
RUN npm install --loglevel info --ignore-scripts=false --foreground-scripts --arch=arm64 --platform=linuxmusl sharp
RUN npm run build
CMD ["npm", "run", "develop"]
