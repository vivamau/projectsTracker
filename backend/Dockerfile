FROM node:20-alpine

WORKDIR /

# Copy package files
COPY package*.json .

# Install production dependencies only
RUN npm install

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p ./data

# Use non-root user for security
USER node

EXPOSE 5000

CMD ["node", "index.js"]
