FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Use non-root user for security
USER node

EXPOSE 5000

CMD ["node", "index.js"]
