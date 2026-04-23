# syntax=docker/dockerfile:1
# Multi-stage build for Colonize — TypeScript monorepo (npm workspaces).
# Builds apps/web (static) and apps/server (Node runtime), plus transitive
# packages/* used by both. Runtime image serves web static + runs server.

# ------ Builder stage ------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root lockfile + every workspace package.json first for layer caching
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/content/package.json ./packages/content/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install all workspaces (including devDeps, needed for build)
RUN npm ci

# Now copy source and build
COPY . .
RUN npm run build --workspaces --if-present

# ------ Runtime stage ------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Reinstall prod-only deps
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/content/package.json ./packages/content/package.json
RUN npm ci --omit=dev --workspace=apps/server --include-workspace-root

# Copy built artifacts from builder
COPY --from=builder /app/apps/server/dist        ./apps/server/dist
COPY --from=builder /app/apps/server/migrations  ./apps/server/migrations
COPY --from=builder /app/apps/web/dist           ./apps/web/dist
COPY --from=builder /app/packages/core/dist      ./packages/core/dist
COPY --from=builder /app/packages/shared/dist    ./packages/shared/dist
COPY --from=builder /app/packages/content        ./packages/content
COPY --from=builder /app/roadmap                 ./roadmap

EXPOSE 3000
CMD ["node", "apps/server/dist/index.js"]
