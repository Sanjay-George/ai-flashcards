# ---- Stage 1: Build ----
FROM node:24-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Compile TypeScript
RUN npm run build

# ---- Stage 2: Production ----
FROM node:24-slim AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-cache

# Copy built files and start script
COPY --from=builder /app/dist ./dist
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
CMD ["/app/start.sh"]