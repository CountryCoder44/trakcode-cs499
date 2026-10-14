# TrakCode production images, all built from the repo root (see docker-compose.yml).
#   api     — Express API (server/), serves /api
#   sandbox — execution sandbox with python3 + g++ + a JDK (services/execution-sandbox/)
#   web     — Caddy: HTTPS + the built React client + reverse proxy to api

FROM node:20-bookworm-slim AS build
WORKDIR /app
# Manifests first so `npm ci` is cached until dependencies change.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY services/execution-sandbox/package.json services/execution-sandbox/
RUN npm ci --no-audit --no-fund
COPY . .
# Same-origin API: the client calls /api on whatever host serves it.
ENV VITE_API_URL=/api
RUN npm run build -w server \
 && npm run build -w @trakcode/execution-sandbox \
 && npm run build -w @trakcode/client

FROM node:20-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 4000
CMD ["node", "server/dist/index.js"]

FROM node:20-bookworm-slim AS sandbox
# Learner code runs here: Python, C++ (g++), Java (OpenJDK 17), and TypeScript
# (esbuild + tsc via node).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 g++ openjdk-17-jdk-headless \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/package.json /app/package.json
COPY --from=build --chown=node:node /app/services/execution-sandbox /app/services/execution-sandbox
USER node
ENV PORT=4100
EXPOSE 4100
CMD ["node", "services/execution-sandbox/dist/index.js"]

FROM caddy:2 AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/client/dist /srv
