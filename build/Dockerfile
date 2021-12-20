# ---- Dependencies ----
FROM node:16-alpine AS base

WORKDIR /usr/app

# ---- Dependencies ----
FROM base AS ts-compiler

COPY . ./

#build tezos-lib
RUN npm --prefix tezos-lib install
RUN npm --prefix tezos-lib run build

#build server
RUN npm --prefix server install
RUN npm --prefix server run build

FROM base as ts-remover
COPY --from=ts-compiler /usr/app/server/package*.json ./server/
COPY --from=ts-compiler /usr/app/server/lib ./server/
COPY --from=ts-compiler /usr/app/tezos-lib/package*.json ./tezos-lib/_dist/
COPY --from=ts-compiler /usr/app/tezos-lib/_dist ./tezos-lib/_dist/
RUN npm install --prefix tezos-lib/_dist --only=production
RUN npm install --prefix server --only=production

# ---- Release ----
FROM base as release
LABEL org.opencontainers.image.source=https://github.com/owneraio/tezos

COPY --from=ts-remover /usr/app ./
RUN ls -la
ENV NODE_ENV=production

# define CMD
CMD [ "node", "./server/index.js" ]
