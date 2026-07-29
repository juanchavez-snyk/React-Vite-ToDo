# Multi-stage build on a current, minimal base image.

# --- build stage -------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy manifests first so dependency layers cache independently of source churn.
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# --- api dependencies --------------------------------------------------------
FROM node:22-alpine AS api-deps

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
# Production dependencies only - no build tooling in the runtime image.
RUN npm ci --omit=dev

# --- runtime -----------------------------------------------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Only the built assets, server source and production dependencies are copied.
# No .git, no .env, no local node_modules - see .dockerignore.
COPY --from=api-deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/dist ./dist
COPY server/index.js server/store.js ./server/
COPY server/routes ./server/routes
COPY server/exports ./server/exports

# Drop to the unprivileged user that the base image already provides.
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
