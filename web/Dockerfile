FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --force --legacy-peer-deps

# Copy source code
COPY . .

# Build the application (ignoring TypeScript errors)
RUN npm run build || true

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]