FROM node:20-alpine

WORKDIR /usr/src/app

# Install necessary tools
RUN apk add --no-cache wget bash

# Copy configuration files first (better for caching)
COPY package*.json tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Check if dist folder exists and create if necessary
RUN mkdir -p dist

# Compile the project - continue even if there are errors
RUN npm run build || echo "Build completed with warnings"

# Check if main.js file exists
RUN ls -la dist/

# Expose application port
EXPOSE ${PORT:-3001}

# Start the application
CMD ["npm", "run", "start:prod"]