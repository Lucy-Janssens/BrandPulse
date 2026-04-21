# --- Stage 1: Build frontend ---
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend deps
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy frontend source and build
COPY index.html vite.config.js eslint.config.js ./
COPY src/ ./src/
COPY public/ ./public/

RUN pnpm build

# --- Stage 2: Build API ---
FROM node:18-alpine AS api-build

WORKDIR /app/api

COPY api/package.json api/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile 2>/dev/null || npm install --production

COPY api/ ./

# --- Stage 3: Production image ---
FROM node:18-alpine

WORKDIR /app

# Copy API
COPY --from=api-build /app/api ./api

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose single API/App port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "api/server.js"]
