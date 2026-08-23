# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ─── Stage 2: Production ────────────────────────────────────────────────────
FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -g 1001 -S taskflow && \
    adduser -S taskflow -u 1001 -G taskflow

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Copy application source
COPY src/ ./src/
COPY public/ ./public/

# Create data directory
RUN mkdir -p /app/data && chown -R taskflow:taskflow /app

USER taskflow

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
