# LeadArrow API — multi-stage image for Render (runs the HTTP/WebSocket server
# and, for a single-instance deploy, the in-process BullMQ workers).

# ---- build ----
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# Copy the whole workspace (the .dockerignore keeps it lean) and install.
COPY . .
RUN pnpm install --frozen-lockfile

# Build the shared package, generate the Prisma client, and compile the API.
RUN pnpm --filter @leadarrow/shared build \
  && pnpm --filter @leadarrow/api prisma:generate \
  && pnpm --filter @leadarrow/api build

# ---- runtime ----
FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

ENV NODE_ENV=production
# The in-process worker runs the routing + reminder queues (single-instance).
ENV ROUTING_WORKER_ENABLED=true

# Bring the installed deps + built output over from the build stage.
COPY --from=build /repo .

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
