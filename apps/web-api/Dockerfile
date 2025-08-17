FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY apps/web-api/package*.json ./apps/web-api/
COPY packages/shared/package*.json ./packages/shared/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application in development mode
CMD ["pnpm", "--filter", "web-api", "dev"]
