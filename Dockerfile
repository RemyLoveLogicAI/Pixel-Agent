# ============================================================================
# Recommended .dockerignore (create as a separate file):
#
#   node_modules
#   .git
#   .memory
#   .sii
#   my-new-app
#   paperclippack
#   artifacts/mockup-sandbox
#   artifacts/api-server/dist
#   **/*.md
#   **/.DS_Store
#   .env*
#   docker-compose.yml
#   Dockerfile
#
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Install dependencies using pnpm with workspace structure
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root manifests first (layer caching for deps)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the package.json files needed by the api-server and its workspace deps.
# This lets Docker cache the install layer when only source code changes.
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json               ./lib/db/
COPY lib/api-zod/package.json          ./lib/api-zod/
COPY lib/api-spec/package.json         ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/

# Install all dependencies (including devDependencies needed for the build)
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2 — Build the production bundle with esbuild
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Bring in the full node_modules tree from the deps stage
COPY --from=deps /app/ ./

# Copy source code for the api-server and its workspace dependencies
COPY tsconfig.base.json ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Run the esbuild production build.
# The build script (build.ts) bundles workspace deps and allowlisted packages
# into a single CJS file at artifacts/api-server/dist/index.cjs
RUN cd artifacts/api-server && pnpm build

# ---------------------------------------------------------------------------
# Stage 3 — Minimal production runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN apk add --no-cache tini

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only the bundled output — esbuild produces a single self-contained file
COPY --from=build /app/artifacts/api-server/dist/index.cjs ./dist/index.cjs

# The build externalises a few native/non-bundleable deps (e.g. cookie-parser).
# Copy only the production node_modules needed at runtime.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

# The bundled file is CJS so we don't need package.json "type": "module",
# but we include a minimal one for Node resolution.
COPY artifacts/api-server/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER appuser

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.cjs"]
