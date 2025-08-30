FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose any ports if needed (your daemon uses host networking)
# EXPOSE 3000

# Start the daemon
CMD ["npm", "start"]
