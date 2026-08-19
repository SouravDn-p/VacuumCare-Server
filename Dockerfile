FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

# PORT is injected at runtime via docker-compose env_file / environment block.
# Default matches the PORT value in .env.example (5000).
EXPOSE 5000

CMD ["npm", "run", "start:docker"]
