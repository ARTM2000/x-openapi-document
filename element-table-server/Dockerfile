FROM node:18-alpine
WORKDIR /opt/app
COPY . .
RUN npm config set fetch-retry-mintimeout 1000000000
RUN npm config set fetch-retry-maxtimeout 6000000000
RUN npm ci --loglevel=info
RUN npm run build
RUN npm cache clear --force
ENV NODE_ENV production
CMD ["npm", "start"]
