# Use Playwright v1.50.0 with noble (Ubuntu 24.04)
FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Remove old source and copy only new files
RUN rm -rf src/ && true
COPY src/ ./src/
COPY main.ts ./
COPY tsconfig.json ./

# Build TypeScript
RUN rm -rf dist node_modules && npm install && npm run build

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
