# syntax=docker/dockerfile:1

# ---- Builder stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (bcryptjs is pure JS — no apk build tools needed)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ---- Runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app

# HOSTNAME=0.0.0.0 is required — without it the standalone server binds to the
# container ID hostname and is unreachable from the LAN even with port mapping.
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run as non-root user (node user exists in official Node.js Alpine images)
USER node

# Copy public assets
COPY --from=builder --chown=node:node /app/public ./public

# Prepare .next directory
RUN mkdir .next

# Copy standalone server and all inlined dependencies
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Copy static assets — not included in standalone automatically
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
