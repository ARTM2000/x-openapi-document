FROM node:18-alpine
WORKDIR /opt/app
COPY . .
RUN npm ci
RUN npm run build
RUN npm cache clear --force
ENV NODE_ENV production
CMD ["npm", "start"]
