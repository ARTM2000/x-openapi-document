FROM node:18-alpine
WORKDIR /opt/app
COPY . .
RUN npm ci
RUN npm run build
RUN npm run swagger
# COPY --from=build /opt/build/build ./build
# COPY --from=build /opt/build/public ./public
# COPY --from=build /opt/build/node_modules ./node_modules
# COPY --from=build /opt/build/package.json ./package.json
# COPY --from=build /opt/build/package-lock.json ./package-lock.json
RUN npm ci --loglevel info --only=production
RUN npm cache clear --force
ENV NODE_ENV production
CMD ["npm", "start"]
