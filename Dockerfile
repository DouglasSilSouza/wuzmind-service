# ==========================================
# STAGE 1: Build stage
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools if necessary
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy full source
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies for production image
RUN npm prune --omit=dev

# ==========================================
# STAGE 2: Production runtime stage
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Use non-root node user
USER node

# Copy dependencies and build artifacts
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose default HTTP port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck definition
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Launch application
CMD ["node", "dist/main.js"]
