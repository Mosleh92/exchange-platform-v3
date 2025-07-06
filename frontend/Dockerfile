# ==============================================
# Frontend Dockerfile - Production Ready
# ==============================================

# Use official Node.js LTS image for building
FROM node:18-alpine AS build

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache git && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx-custom && \
    adduser -S nginx-custom -u 1001 && \
    chown -R nginx-custom:nginx-custom /var/cache/nginx && \
    chown -R nginx-custom:nginx-custom /var/log/nginx && \
    chown -R nginx-custom:nginx-custom /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-custom:nginx-custom /var/run/nginx.pid

# Switch to non-root user
USER nginx-custom

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
