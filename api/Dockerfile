# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (cached unless package.json changes)
COPY package.json ./
RUN npm install

# Copy source + prisma schema, generate client, build
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Bring over built app, deps, prisma (schema + generated client + seed)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4000

# Apply migrations, then start the compiled server.
CMD ["./entrypoint.sh"]
