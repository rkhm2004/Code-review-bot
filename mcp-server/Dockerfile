FROM node:20-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the backend runs on
EXPOSE 3001

# Force Docker to run the long-running development server
CMD ["npm", "run", "dev"]