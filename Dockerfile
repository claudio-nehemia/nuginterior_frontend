# Step 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
RUN npm ci

# Copy the rest of the code
COPY . .

# Pass build-time environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the app
RUN npm run build

# Step 2: Serve using Nginx
FROM nginx:alpine

# Copy custom Nginx config for React routing (single page application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
