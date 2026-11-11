# ==============================================================================
# Multi-stage Production Dockerfile for School Management Platform API
# Optimized for minimal attack surface, layer caching, and non-root execution
# ==============================================================================

# Stage 1: Build & Dependency Resolution
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

# Leverage Docker layer caching by copying package descriptors first
COPY package.json package-lock.json* ./

# Install only production dependencies for lean final artifact
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck probing
RUN apk add --no-cache curl

# Security: Create non-root system group and user
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Create logs directory and assign permissions to non-root user
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Copy production dependencies from builder stage
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application source code
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup src/ ./src/

# Enforce least privilege: switch to unprivileged user
USER appuser

# Expose internal API service port
EXPOSE 3000

# Set environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    TRUST_PROXY=true

# Container healthcheck instruction
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start service
CMD ["node", "src/server.js"]
