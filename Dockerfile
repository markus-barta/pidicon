FROM node:18-alpine

# Install git for versioning (fallback for local builds)
RUN apk add --no-cache git

# Build arguments for version info
ARG GITHUB_SHA
ARG GITHUB_REF
ARG BUILD_DATE
ARG GIT_COMMIT_COUNT

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build script)
RUN npm ci

# Copy source code
COPY . .

# Make wrapper script executable
RUN chmod +x start-daemon.sh

# Set environment variables for version info from build args
ENV GITHUB_SHA=${GITHUB_SHA}
ENV GITHUB_REF=${GITHUB_REF}
ENV BUILD_DATE=${BUILD_DATE}
ENV GIT_COMMIT_COUNT=${GIT_COMMIT_COUNT}

# Run the build script to generate version.json
RUN npm run build:version

# Prune dev dependencies for a smaller final image
RUN npm prune --production

# Start via wrapper script (allows in-container restarts)
CMD ["./start-daemon.sh"]
