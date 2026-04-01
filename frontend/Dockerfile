# Stage 1: Build React app with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL (empty by default = relative paths)
ARG VITE_API_URL=""

# Build the React app
RUN VITE_API_URL=${VITE_API_URL} npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Install gettext for envsubst (used to substitute BACKEND_URL at runtime)
RUN apk add --no-cache gettext

# Copy Nginx configuration as template (for environment variable substitution)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy entrypoint script that handles variable substitution
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx cache directories with proper permissions
RUN mkdir -p /var/cache/nginx && \
    mkdir -p /var/run && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
