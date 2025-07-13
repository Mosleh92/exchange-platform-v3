# ==============================================
# Frontend Dockerfile - Production Ready (Fly.io Optimized)
# ==============================================

# Build stage
FROM node:18-alpine AS build

# Install security updates and git
RUN apk update && apk upgrade && \
    apk add --no-cache git && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application for production
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install security updates and curl for health checks
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx-custom && \
    adduser -S nginx-custom -u 1001 -G nginx-custom && \
    chown -R nginx-custom:nginx-custom /var/cache/nginx && \
    chown -R nginx-custom:nginx-custom /var/log/nginx && \
    chown -R nginx-custom:nginx-custom /etc/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-custom:nginx-custom /var/run/nginx.pid

# Switch to non-root user  
USER nginx-custom

# Health check optimized for Fly.io
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port 3000 for Fly.io
EXPOSE 3000

# Start Nginx on port 3000
CMD ["nginx", "-g", "daemon off;"]
