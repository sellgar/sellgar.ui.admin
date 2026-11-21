# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS dependencies

WORKDIR /app/code

COPY code/ ./

RUN node .yarn/releases/yarn-4.18.0.cjs install --immutable

FROM dependencies AS builder
RUN node .yarn/releases/yarn-4.18.0.cjs build:admin_ui

FROM dependencies AS tests
RUN node .yarn/releases/yarn-4.18.0.cjs test --maxWorkers=2

FROM nginx:1.30.7-alpine@sha256:bef154735288bc38d99fac41ae63730684bcc661503673a04a0f9bc526ba8598 AS application
LABEL io.sellgar.image-role=application

COPY code/clients/admin/nginx/nginx.conf /etc/nginx/nginx.conf
COPY code/clients/admin/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/code/clients/admin/build/ /usr/share/nginx/html/

USER nginx

EXPOSE 8080

ENTRYPOINT ["nginx", "-g", "daemon off;"]
