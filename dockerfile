# Use the official Node 23 image
FROM node:23

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --production

# Copy the rest of your code
COPY . .

# Expose port (assuming Express runs on 3000)
EXPOSE 3000

# Set environment variables (optional if using docker-compose)
# ENV NODE_ENV=production

# Start the app
CMD ["npm", "start"]