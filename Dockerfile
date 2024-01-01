FROM node:16-alpine as base
WORKDIR /usr/src/app
COPY . .
RUN yarn install --ignore-engines
RUN yarn build

FROM base as gatewayServer
WORKDIR /usr/src/app1
COPY --from=base /usr/src/app .
EXPOSE 3000
CMD yarn serve:gateway

FROM base as appointmentServer
WORKDIR /usr/src/app2
COPY --from=base /usr/src/app .
EXPOSE 3001
CMD yarn serve:apt
