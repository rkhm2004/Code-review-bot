# frontend/Dockerfile
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Expose the standard Next.js port (3000)
EXPOSE 3000

# Disable Next.js telemetry for privacy
ENV NEXT_TELEMETRY_DISABLED 1

# Start the Next.js development server with hot-reloading
CMD ["npm", "run", "dev"]