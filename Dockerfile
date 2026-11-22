FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json prisma.config.ts ./
COPY database ./database
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/package.json /app/package-lock.json /app/prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/database ./database
COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["node", "build/src/server.js"]
