# Use Node.js 20 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock files
COPY package.json ./


# Install dependencies
RUN npm install -g npm && npm install

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN npm build

# Expose port
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
