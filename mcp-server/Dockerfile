# mcp-server/Dockerfile
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Expose the port Fastify is running on (3001)
EXPOSE 3001

# Run the server using tsx (allows executing TS files directly without a build step)
CMD ["npx", "tsx", "src/index.ts"]