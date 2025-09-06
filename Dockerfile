FROM node:18-alpine

# Build arguments for version info
ARG GITHUB_SHA
ARG GITHUB_REF
ARG BUILD_DATE

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build script)
RUN npm ci

# Copy source code into the /app directory inside the Docker image.
COPY . .

# Set environment variables for version info
ENV GITHUB_SHA=${GITHUB_SHA}
ENV GITHUB_REF=${GITHUB_REF}
ENV BUILD_DATE=${BUILD_DATE}
ENV IMAGE_TAG=${GITHUB_REF#refs/heads/}

# Run the build script to generate version.json
RUN npm run build:version

# Prune dev dependencies
RUN npm prune --production

# Expose any ports if needed (your daemon uses host networking)
# EXPOSE 3000

# Start the daemon
CMD ["npm", "start"]
