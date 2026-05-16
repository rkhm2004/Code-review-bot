FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the frontend code
COPY . .

# Expose the Next.js port
EXPOSE 3000

# Start Next.js in dev mode
CMD ["npm", "run", "dev"]