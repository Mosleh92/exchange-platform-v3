# ==============================================
# Backend Dockerfile - Production Ready (Fly.io Optimized)
# ==============================================

# Use Node.js 18 LTS Alpine for smaller image
FROM node:18-alpine AS dependencies

# Install security updates and dependencies for native modules
RUN apk update && apk upgrade && \
    apk add --no-cache python3 make g++ curl && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Production stage
FROM node:18-alpine AS production

# Install security updates and curl for health checks
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p uploads logs && \
    chmod 755 uploads logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check optimized for Fly.io
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
