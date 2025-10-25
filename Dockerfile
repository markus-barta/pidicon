# ============================================================================
# Stage 1: Build Stage (with all dev dependencies)
# ============================================================================
FROM node:24-alpine AS builder

# Install git for version detection
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install ALL dependencies (including dev for build tools)
RUN npm ci --include=dev

# Copy only files needed for building
COPY daemon.js start-daemon.sh ./
COPY lib/ ./lib/
COPY scenes/ ./scenes/
COPY web/ ./web/
COPY vite.config.mjs ./
COPY scripts/build-version.js ./scripts/

# Build arguments for version info
ARG GITHUB_SHA
ARG GITHUB_REF
ARG BUILD_DATE
ARG GIT_COMMIT_COUNT

# Set environment variables for build
ENV GITHUB_SHA=${GITHUB_SHA}
ENV GITHUB_REF=${GITHUB_REF}
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_COMMIT_COUNT=${GIT_COMMIT_COUNT}

# Build version info and Vue frontend
RUN npm run build:version
RUN npm run ui:build

# ============================================================================
# Stage 2: Production Stage (minimal runtime image)
# ============================================================================
FROM node:24-alpine

# Install only runtime system dependencies
# git: fallback version detection
# wget: health check
RUN apk add --no-cache git wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/version.json ./version.json
COPY --from=builder /app/web/public/ ./web/public/

# Copy runtime application code
COPY daemon.js start-daemon.sh ./
COPY lib/ ./lib/
COPY web/server.js ./web/
# Copy bundled scenes (recursively includes examples/dev helpers)
COPY scenes/ ./scenes/
COPY config/ ./config/

# Copy test infrastructure for server-side test execution
COPY test/ ./test/
COPY scripts/run-node-tests.js ./scripts/

# Make wrapper script executable
RUN chmod +x start-daemon.sh

# Create /data directory for persistent config
RUN mkdir -p /data && chmod 755 /data

# Set PATH
ENV PATH="/usr/local/bin:$PATH"
ENV NODE_ENV=production

# Health check (checks if Web UI is responding)
# Note: Disabled by default - enable if needed
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget --no-verbose --tries=1 --spider http://localhost:${PIDICON_WEB_PORT:-10829}/ || exit 1

# Start via wrapper script
CMD ["./start-daemon.sh"]
